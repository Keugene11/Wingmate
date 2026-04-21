import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

// Pull DATABASE_URL from .env.local.
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "").replace(/\\n$/, "")];
    })
);

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sqlText = readFileSync(file, "utf8");

const client = neon(env.DATABASE_URL);

// Split on semicolons but respect dollar-quoted function bodies.
function splitStatements(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "$" && text[i + 1] === "$") {
      inDollar = !inDollar;
      buf += "$$";
      i++;
      continue;
    }
    if (ch === ";" && !inDollar) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const statements = splitStatements(sqlText);
console.log(`Applying ${statements.length} statement(s) from ${file}...`);

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
  console.log(`  > ${preview}${stmt.length > 90 ? "..." : ""}`);
  try {
    await client.query(stmt);
  } catch (e) {
    console.error(`  FAILED:`, e.message);
    process.exit(1);
  }
}
console.log("Done.");
