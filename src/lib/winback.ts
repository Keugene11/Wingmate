// Shared helper used by every paywall surface (plans page, onboarding):
// after a user cancels checkout, ask the server if they're still eligible
// for the one-shot win-back offer and route them to /spin if so.
export async function maybeRouteToWinback(
  router: { push: (href: string) => void }
): Promise<boolean> {
  try {
    const res = await fetch("/api/winback/eligibility");
    const data = await res.json();
    if (data?.eligible) {
      router.push("/spin");
      return true;
    }
  } catch {
    // Eligibility check failed — fail closed (no offer) rather than
    // showing the wheel without server-side gating.
  }
  return false;
}
