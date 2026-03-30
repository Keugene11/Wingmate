import { signIn } from "@/lib/auth";

export async function GET() {
  return signIn("apple", { redirectTo: "/api/auth/native/done" });
}
