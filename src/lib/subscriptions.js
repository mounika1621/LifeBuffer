import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const ENTITLEMENT = "lifebuffer_pro";

export async function configureRevenueCat(userId) {
  if (Platform.OS === "web") return false;
  const apiKey = Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (!apiKey) throw new Error("RevenueCat API key is missing. Add the platform key to .env and rebuild the app.");
  Purchases.setLogLevel(LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey, appUserID: userId });
  return true;
}

export async function getProStatus(userId) {
  if (Platform.OS === "web") return { active: false, info: null };
  await configureRevenueCat(userId);
  const info = await Purchases.getCustomerInfo();
  return { active: !!info.entitlements.active[ENTITLEMENT], info };
}

export async function getPackages(userId) {
  if (Platform.OS === "web") return [];
  await configureRevenueCat(userId);
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages || [];
}

export async function purchasePackage(userId, pkg) {
  if (Platform.OS === "web") throw new Error("Real Google Play/App Store billing needs a native build. Web billing can be configured separately in RevenueCat.");
  await configureRevenueCat(userId);
  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restoreSubscription(userId) {
  if (Platform.OS === "web") throw new Error("Restore purchases is available in the native app.");
  await configureRevenueCat(userId);
  return Purchases.restorePurchases();
}

export function hasPro(customerInfo) {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT];
}
