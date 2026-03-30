import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

const PAGE_SIZE = 20;

// GET — List posts with optional search, sort, pagination
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "new"; // "new" | "top"
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10));
  const query = url.searchParams.get("q") || "";
  const userId = url.searchParams.get("user_id") || "";

  const offset = page * PAGE_SIZE;
  const orderCol = sort === "top" ? "score" : "created_at";

  let posts;

  if (userId) {
    // Fetch posts by a specific user
    posts = await sql`
      SELECT * FROM posts
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;
  } else if (query) {
    // Sanitize: strip characters that could break LIKE patterns
    const safe = query.replace(/[%_(),.*\\]/g, "");
    if (!safe) {
      return NextResponse.json({ posts: [], votes: {}, hasMore: false });
    }
    const pattern = `%${safe}%`;

    if (orderCol === "score") {
      posts = await sql`
        SELECT * FROM posts
        WHERE title ILIKE ${pattern} OR body ILIKE ${pattern} OR author_name ILIKE ${pattern}
        ORDER BY score DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;
    } else {
      posts = await sql`
        SELECT * FROM posts
        WHERE title ILIKE ${pattern} OR body ILIKE ${pattern} OR author_name ILIKE ${pattern}
        ORDER BY created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;
    }
  } else {
    if (orderCol === "score") {
      posts = await sql`
        SELECT * FROM posts
        ORDER BY score DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;
    } else {
      posts = await sql`
        SELECT * FROM posts
        ORDER BY created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;
    }
  }

  // Fetch current user's votes for these posts
  const votes: Record<string, number> = {};
  if (posts.length > 0) {
    const ids = posts.map((p: any) => p.id);
    const userVotes = await sql`
      SELECT post_id, direction FROM votes
      WHERE user_id = ${session.user.id} AND post_id = ANY(${ids})
    `;
    for (const v of userVotes) {
      votes[v.post_id] = v.direction;
    }
  }

  return NextResponse.json({
    posts,
    votes,
    hasMore: posts.length === PAGE_SIZE,
  });
}

// POST — Create a new post
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body } = await req.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const trimmedTitle = title.trim().slice(0, 120);
  const trimmedBody = body.trim().slice(0, 2000);

  // Get username from profile
  const profiles = await sql`
    SELECT username FROM profiles WHERE id = ${session.user.id}
  `;
  const displayName = profiles[0]?.username || "user_" + session.user.id.slice(-6);

  const rows = await sql`
    INSERT INTO posts (user_id, author_name, title, body)
    VALUES (${session.user.id}, ${displayName}, ${trimmedTitle}, ${trimmedBody})
    RETURNING *
  `;

  return NextResponse.json({ post: rows[0] }, { status: 201 });
}
