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

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: allCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at, talked, opportunities_count, approaches_count, successes_count")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false });

  const checkins = (allCheckins || []).map((c: any) => ({
    date: c.checked_in_at,
    talked: c.talked,
    opportunities: c.opportunities_count || 0,
    approaches: c.approaches_count || 0,
    successes: c.successes_count || 0,
  }));

  return NextResponse.json({ checkins });
}
