import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { getPackages, getProStatus, purchasePackage, restoreSubscription, hasPro } from "../lib/subscriptions";

const FALLBACK = [
  { key: "monthly", name: "Monthly", price: "₹99 / month", tag: "Flexible" },
  { key: "annual", name: "Yearly", price: "₹799 / year", tag: "Best value" },
  { key: "student", name: "Student", price: "₹499 / year", tag: "Student offer" },
];

export default function Premium() {
  const [packages, setPackages] = useState([]);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [platformMessage, setPlatformMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      if (Platform.OS === "web") {
        setPlatformMessage("You are viewing the web preview. Real Google Play billing opens from the Android app build.");
        return;
      }
      const status = await getProStatus(user.id);
      setActive(status.active);
      const list = await getPackages(user.id);
      setPackages(list);
    } catch (e) {
      Alert.alert("Subscription setup", e.message || "Could not load plans.");
    } finally { setLoading(false); }
  }

  function labelFor(pkg) {
    const id = String(pkg?.identifier || "").toLowerCase();
    if (id.includes("student")) return "student";
    if (id.includes("annual") || id.includes("year")) return "annual";
    return "monthly";
  }

  async function choose(pkg) {
    if (!pkg) return Alert.alert("Plans not loaded", "Create the products and offering in RevenueCat first, then reopen this page.");
    if (Platform.OS === "web") {
      return Alert.alert("Android billing", "Open the Android LifeBuffer build to continue. Google Play Billing will show the available payment methods, including supported UPI/payment options.");
    }
    try {
      setBuying(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const info = await purchasePackage(user.id, pkg);
      const unlocked = hasPro(info);
      setActive(unlocked);
      if (unlocked) {
        await supabase.from("profiles").update({ plan: "pro" }).eq("id", user.id);
        Alert.alert("LifeBuffer Pro unlocked 🎉", "Your Pro features are now enabled.");
      }
    } catch (e) {
      if (!String(e?.message || "").toLowerCase().includes("cancel")) Alert.alert("Purchase not completed", e.message || "Please try again.");
    } finally { setBuying(false); }
  }

  async function restore() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const info = await restoreSubscription(user.id);
      const unlocked = hasPro(info);
      setActive(unlocked);
      if (unlocked) await supabase.from("profiles").update({ plan: "pro" }).eq("id", user.id);
      Alert.alert(unlocked ? "Restored 🎉" : "No active Pro plan", unlocked ? "Your Pro access is active again." : "We could not find an active Pro purchase.");
    } catch (e) { Alert.alert("Restore", e.message || "Restore failed."); }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
    <Text style={styles.crown}>👑</Text><Text style={styles.title}>LifeBuffer Pro</Text><Text style={styles.sub}>A smarter buffer for planning, overload rescue and deeper insights.</Text>
    <View style={styles.trial}><Text style={styles.trialTitle}>✨ 3-day free trial</Text><Text style={styles.trialText}>Configure the 3-day introductory offer in Google Play + RevenueCat. The store controls billing and the trial period.</Text></View>
    {active && <View style={styles.active}><Text style={styles.activeTitle}>✓ Pro is active</Text><Text style={styles.activeText}>AI planning, advanced analytics and smart rescue are enabled for this account.</Text></View>}
    {platformMessage ? <View style={styles.notice}><Text style={styles.noticeText}>{platformMessage}</Text></View> : null}

    {loading ? <ActivityIndicator size="large" color="#A5E1BF" style={{ margin: 25 }} /> : packages.length ? packages.map(pkg => { const key=labelFor(pkg); const fallback=FALLBACK.find(x=>x.key===key)||FALLBACK[0]; const product=pkg.product; return <View key={pkg.identifier} style={styles.plan}><View style={{flex:1}}><Text style={styles.planName}>{fallback.name}</Text><Text style={styles.tag}>{fallback.tag}</Text><Text style={styles.price}>{product?.priceString || fallback.price}</Text><Text style={styles.small}>3-day trial may appear when the configured store offer is eligible.</Text></View><Pressable style={styles.button} onPress={()=>choose(pkg)} disabled={buying}><Text style={styles.buttonText}>{buying?"Opening…":"Continue"}</Text></Pressable></View> }) : FALLBACK.map(p=><View key={p.key} style={styles.plan}><View style={{flex:1}}><Text style={styles.planName}>{p.name}</Text><Text style={styles.tag}>{p.tag}</Text><Text style={styles.price}>{p.price}</Text><Text style={styles.small}>Configure this product in RevenueCat to make Continue open billing.</Text></View><Pressable style={styles.button} onPress={()=>choose(null)}><Text style={styles.buttonText}>Continue</Text></Pressable></View>)}

    <Pressable style={styles.restore} onPress={restore}><Text style={styles.restoreText}>Restore purchases</Text></Pressable>
    <Text style={styles.featuresTitle}>Pro includes</Text>{["🤖 AI workload planning","🛟 Smart Rescue Mode","📊 Advanced analytics","🧠 Personalized scheduling","🎯 Goal planning","☁️ Cross-device subscription access"].map(x=><Text key={x} style={styles.feature}>{x}</Text>)}
    <Text style={styles.disclaimer}>Subscriptions are processed by the platform store. The app does not collect or store card/UPI credentials.</Text>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#101E19"},container:{padding:22,paddingBottom:50,maxWidth:850,width:"100%",alignSelf:"center"},back:{color:"#B9D9C8",fontWeight:"800",fontSize:16},crown:{fontSize:45,marginTop:25},title:{color:"#fff",fontSize:34,fontWeight:"900",marginTop:5},sub:{color:"#B6C9C0",lineHeight:20,marginTop:7,marginBottom:18},trial:{backgroundColor:"#1E3B31",borderRadius:20,padding:18,marginBottom:10},trialTitle:{color:"#fff",fontWeight:"900",fontSize:17},trialText:{color:"#AFC4B9",marginTop:5,lineHeight:18},active:{backgroundColor:"#DFF4E6",borderRadius:18,padding:16,marginBottom:10},activeTitle:{fontWeight:"900",color:"#146B4A"},activeText:{color:"#557263",marginTop:4},notice:{backgroundColor:"#263B34",borderRadius:16,padding:14,marginBottom:8},noticeText:{color:"#C8D8D1",fontSize:12,lineHeight:18},plan:{backgroundColor:"#fff",borderRadius:20,padding:17,marginTop:10,flexDirection:"row",alignItems:"center"},planName:{fontSize:17,fontWeight:"900",color:"#173B2B"},tag:{color:"#6D8176",fontSize:11,marginTop:3},price:{fontSize:25,fontWeight:"900",color:"#147A55",marginTop:7},small:{fontSize:10,color:"#819088",marginTop:5,maxWidth:340,lineHeight:14},button:{backgroundColor:"#147A55",borderRadius:13,paddingHorizontal:14,paddingVertical:12},buttonText:{color:"#fff",fontWeight:"900"},restore:{alignItems:"center",padding:16},restoreText:{color:"#B9D9C8",fontWeight:"800"},featuresTitle:{color:"#fff",fontSize:18,fontWeight:"900",marginTop:10,marginBottom:8},feature:{color:"#D0DDD7",paddingVertical:7,fontSize:15},disclaimer:{color:"#7F938A",fontSize:10,lineHeight:15,marginTop:20}});
