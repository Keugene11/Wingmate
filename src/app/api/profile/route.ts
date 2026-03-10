import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// GET — fetch profile
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If no profile yet, create one
  if (!profile) {
    const meta = user.user_metadata;
    const username = (meta?.full_name || meta?.name || user.email?.split("@")[0] || "").split(" ")[0];
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username, avatar_url: meta?.avatar_url || meta?.picture || null })
      .select()
      .single();
    return NextResponse.json({ profile: newProfile });
  }

  return NextResponse.json({ profile });
}

// PATCH — update profile
export async function PATCH(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };

  if (body.username !== undefined) {
    const username = body.username.trim().slice(0, 30);
    if (username.length < 1) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    updates.username = username;
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
