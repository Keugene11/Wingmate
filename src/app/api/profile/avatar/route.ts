import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const blob = await put(`avatars/${userId}/avatar.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  const avatar_url = blob.url;

  const rows = await sql`
    UPDATE profiles SET avatar_url = ${avatar_url}, updated_at = now()
    WHERE id = ${userId}
    RETURNING *
  `;

  return NextResponse.json({ profile: rows[0] || null });
}
