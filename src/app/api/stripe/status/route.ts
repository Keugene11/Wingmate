import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ subscribed: false, subscription: null });

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("status, price_id, current_period_start, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    return NextResponse.json({
      subscribed: !!subscription,
      subscription: subscription || null,
    });
  } catch {
    return NextResponse.json({ subscribed: false, subscription: null });
  }
}
