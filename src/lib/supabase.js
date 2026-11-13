import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const serverStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const storage =
  Platform.OS === "web"
    ? typeof window !== "undefined"
      ? window.localStorage
      : serverStorage
    : AsyncStorage;

export const supabase = createClient(url, key, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
