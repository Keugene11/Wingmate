import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const subs = await sql`
      SELECT price_id FROM subscriptions
      WHERE status IN ('active', 'trialing')
    `;

    let monthly = 0;
    let yearly = 0;

    for (const sub of subs) {
      const pid = sub.price_id || "";
      if (pid.includes("year")) yearly++;
      else monthly++;
    }

    return NextResponse.json({ monthly, yearly });
  } catch {
    return NextResponse.json({ monthly: 0, yearly: 0 });
  }
}
