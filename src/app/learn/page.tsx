import { redirect } from "next/navigation";

export default function LearnIndexRedirect() {
  redirect("/?tab=learn");
}
