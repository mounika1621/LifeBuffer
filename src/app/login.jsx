import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Almost there", "Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password", "Use at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) {
          Alert.alert(
            "Check your email",
            "Your account was created. Confirm your email if email confirmation is enabled, then log in."
          );
          setIsSignup(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      router.replace("/");
    } catch (error) {
      Alert.alert("Couldn't continue", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logo}><Text style={styles.logoText}>🌱</Text></View>
          <Text style={styles.brand}>LifeBuffer</Text>
          <Text style={styles.tagline}>Plan • Focus • Achieve</Text>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{isSignup ? "Create your space" : "Welcome back"}</Text>
            <Text style={styles.heroText}>
              {isSignup
                ? "Build a calmer schedule that fits your real life."
                : "Let's make today lighter, one small step at a time. 💚"}
            </Text>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9AA39D"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#9AA39D"
              secureTextEntry={!showPassword}
              style={styles.password}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#547061" />
            </Pressable>
          </View>

          <Pressable style={styles.primary} onPress={submit} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>

          <Pressable style={styles.switch} onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switchText}>
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <Text style={styles.switchStrong}>{isSignup ? "Login" : "Sign Up"}</Text>
            </Text>
          </Pressable>

          <Text style={styles.quote}>“Start before you're ready.”</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7FBF6" },
  container: { flexGrow: 1, padding: 28, justifyContent: "center" },
  logo: { alignSelf: "center", width: 68, height: 68, borderRadius: 22, backgroundColor: "#E3F4E7", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 34 },
  brand: { textAlign: "center", marginTop: 10, fontSize: 32, fontWeight: "800", color: "#173B2B" },
  tagline: { textAlign: "center", color: "#71907E", marginTop: 3, marginBottom: 28 },
  hero: { backgroundColor: "#EAF7ED", padding: 20, borderRadius: 24, marginBottom: 22 },
  heroTitle: { fontSize: 23, fontWeight: "800", color: "#173B2B" },
  heroText: { color: "#587163", marginTop: 6, lineHeight: 20 },
  label: { color: "#294A3A", fontWeight: "700", marginBottom: 7, marginTop: 10 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DCE8DE", borderRadius: 15, padding: 15, color: "#173B2B" },
  passwordWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#DCE8DE", borderRadius: 15, paddingHorizontal: 15 },
  password: { flex: 1, paddingVertical: 15, color: "#173B2B" },
  primary: { marginTop: 24, backgroundColor: "#147A55", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  switch: { padding: 18, alignItems: "center" },
  switchText: { color: "#6D7E73" },
  switchStrong: { color: "#147A55", fontWeight: "800" },
  quote: { textAlign: "center", color: "#91A196", marginTop: 16, fontStyle: "italic" },
});
