import { sql } from "./db";

export async function isPro(userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT status FROM subscriptions
    WHERE user_id = ${userId} AND status IN ('active', 'trialing')
    LIMIT 1
  `;
  return rows.length > 0;
}
