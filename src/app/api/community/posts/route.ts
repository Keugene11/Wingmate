import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { moderateContent } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/ratelimit";

const PAGE_SIZE = 20;

async function requirePro(userId: string) {
  const rows = await sql`
    SELECT status FROM subscriptions WHERE user_id = ${userId} AND status IN ('active', 'trialing') LIMIT 1
  `;
  return rows.length > 0;
}

// GET — List posts with optional search, sort, pagination
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await requirePro(session.user.id))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "new"; // "new" | "top"
  const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10));
  const query = url.searchParams.get("q") || "";
  const userId = url.searchParams.get("user_id") || "";

  const offset = page * PAGE_SIZE;
  const orderCol = sort === "top" ? "score" : "created_at";

  // Get list of users the current user has blocked
  const blockedRows = await sql`
    SELECT blocked_id FROM blocked_users WHERE blocker_id = ${session.user.id}
  `;
  const blockedIds = blockedRows.map((r: any) => r.blocked_id);

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

  // Filter out posts from blocked users
  if (blockedIds.length > 0) {
    posts = posts.filter((p: any) => !blockedIds.includes(p.user_id));
  }

  // Fetch current user's votes for these posts + 2 newest comments per post
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

    // Top 2 newest comments per post via a lateral window.
    const previewComments = await sql`
      SELECT id, post_id, author_name, body, created_at FROM (
        SELECT c.*, row_number() OVER (PARTITION BY post_id ORDER BY created_at DESC) AS rn
        FROM comments c
        WHERE post_id = ANY(${ids})
      ) t
      WHERE rn <= 2
      ORDER BY created_at ASC
    `;
    const byPost: Record<string, any[]> = {};
    for (const c of previewComments) {
      (byPost[c.post_id] ||= []).push(c);
    }
    posts = posts.map((p: any) => ({ ...p, recent_comments: byPost[p.id] || [] }));
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

  if (!(await requirePro(session.user.id))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  if (!(await checkRateLimit("community:post", session.user.id, 10, "1 h"))) {
    return NextResponse.json({ error: "You're posting too fast. Try again in a bit." }, { status: 429 });
  }

  const { body } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  const trimmedBody = body.trim().slice(0, 2000);
  const trimmedTitle = ""; // Twitter-style: no separate title.

  const bodyCheck = moderateContent(trimmedBody);
  if (!bodyCheck.allowed) {
    return NextResponse.json({ error: bodyCheck.reason }, { status: 400 });
  }

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
