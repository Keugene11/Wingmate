import { isNativeAndroid, isNativeiOS, isNativePlatform } from "./platform";

let initialized = false;
let initPromise: Promise<void> | null = null;

function getApiKey(): string | undefined {
  if (isNativeiOS()) return process.env.NEXT_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim();
  if (isNativeAndroid()) return process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim();
  return undefined;
}

/**
 * Initialize RevenueCat. Call once on app load.
 * Initializes on native iOS (Apple key) and native Android (Google key).
 * Returns a promise that resolves when initialization is complete.
 * Safe to call multiple times — deduplicates concurrent calls.
 */
export async function initPurchases(): Promise<string> {
  if (!isNativePlatform()) return "skip:not-native";
  if (initialized) return "already-initialized";
  if (initPromise) { await initPromise; return initialized ? "ok:from-existing-promise" : "fail:existing-promise-failed"; }

  initPromise = (async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn("[IAP] RevenueCat API key not configured for this platform — skipping init");
      return;
    }

    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      console.log("[IAP] Configuring RevenueCat with key:", apiKey.substring(0, 10) + "...");
      await Purchases.configure({ apiKey });
      initialized = true;
      console.log("[IAP] RevenueCat initialized successfully");
    } catch (e) {
      console.error("[IAP] Failed to initialize RevenueCat:", e);
      initPromise = null; // Allow retry on next call
    }
  })();

  await initPromise;
  return initialized ? "ok:initialized" : `fail:key=${getApiKey() ? "present" : "MISSING"}`;
}

/**
 * Identify the RevenueCat user with Supabase user ID.
 * Call after authentication.
 */
export async function identifyUser(userId: string) {
  if (!isNativePlatform() || !initialized) return;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logIn({ appUserID: userId });
  } catch (e) {
    console.error("Failed to identify RevenueCat user:", e);
  }
}

/**
 * Get available subscription packages.
 */
export async function getOfferings(): Promise<{ availablePackages?: unknown[]; [key: string]: unknown } | null> {
  if (!isNativePlatform()) { console.log("[IAP] getOfferings: not native, Capacitor=" + typeof window?.Capacitor); return null; }
  if (!initialized) { console.log("[IAP] getOfferings: not initialized, initPromise=" + !!initPromise); return null; }

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    console.log("[IAP] Raw offerings keys:", Object.keys(offerings || {}));
    console.log("[IAP] Current offering:", JSON.stringify(offerings?.current));
    console.log("[IAP] All offerings:", JSON.stringify(offerings?.all));
    return offerings.current as { availablePackages?: unknown[]; [key: string]: unknown } | null;
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; underlyingErrorMessage?: string };
    console.error("[IAP] getOfferings ERROR:", err.message, err.code, err.underlyingErrorMessage, JSON.stringify(e));
    return null;
  }
}

/**
 * Purchase a package by its identifier.
 * Returns true if purchase was successful.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purchasePackage(packageToPurchase: any) {
  if (!isNativePlatform() || !initialized) return false;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });
    // Check if the user now has an active entitlement
    const entitlements = result?.customerInfo?.entitlements?.active;
    return !!entitlements && Object.keys(entitlements).length > 0;
  } catch (e: unknown) {
    const error = e as { code?: number | string; userCancelled?: boolean; message?: string };
    // RevenueCat code 1 = PURCHASE_CANCELLED_ERROR
    const code = String(error.code ?? "");
    if (error.userCancelled || code === "1") return false;
    console.error("Purchase failed:", JSON.stringify(e));
    throw e;
  }
}

/**
 * Restore previous purchases.
 * Returns true if user has active entitlement after restore.
 */
export async function restorePurchases() {
  if (!isNativePlatform() || !initialized) return false;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const result = await Purchases.restorePurchases();
    const entitlements = result?.customerInfo?.entitlements?.active;
    return !!entitlements && Object.keys(entitlements).length > 0;
  } catch (e) {
    console.error("Restore failed:", e);
    return false;
  }
}

/**
 * Check if user has active subscription via RevenueCat.
 */
export async function checkSubscription() {
  if (!isNativePlatform() || !initialized) return false;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const info = await Purchases.getCustomerInfo();
    const entitlements = info?.customerInfo?.entitlements?.active;
    return !!entitlements && Object.keys(entitlements).length > 0;
  } catch (e) {
    console.error("Failed to check subscription:", e);
    return false;
  }
}
