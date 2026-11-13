import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

function dueText(task) {
  const due = new Date(task.due_at || `${task.deadline}T23:59:00`);
  const diff = due.getTime() - Date.now();
  if (Number.isNaN(due.getTime())) return "Unknown";
  if (diff < 0) return "Overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Analytics() {
  const [tasks, setTasks] = useState([]);
  const [reward, setReward] = useState({ coins: 0, streak: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const [t, r, p] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).order("due_at", { ascending: true }),
        supabase.from("user_rewards").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      setTasks(t.data || []); setReward(r.data || { coins: 0, streak: 0 }); setProfile(p.data || null); setLoading(false);
    })();
  }, []);

  const done = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed);
  const total = tasks.length;
  const score = total ? Math.round((done / total) * 100) : 0;
  const planned = pending.reduce((s,t)=>s+Number(t.estimated_hours||0),0);
  const available = Number(profile?.daily_available_hours || 4);
  const ratio = available ? planned / available : 0;
  const risk = ratio >= 1.4 ? "CRITICAL" : ratio >= 1 ? "HIGH" : ratio >= .7 ? "MODERATE" : "SAFE";
  const overdue = pending.filter(t => dueText(t) === "Overdue").length;
  const insight = useMemo(() => {
    if (overdue) return `You have ${overdue} overdue task${overdue > 1 ? "s" : ""}. Protect the nearest important deadline first.`;
    if (risk === "CRITICAL" || risk === "HIGH") return "Your plan is heavier than your available time. Reduce optional work before adding more.";
    if (score >= 80) return "You're building strong momentum. Keep a small buffer instead of filling every hour.";
    return "You do not need to finish everything at once. Consistency beats last-minute pressure.";
  }, [overdue, risk, score]);

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.load}><ActivityIndicator size="large" color="#147A55"/></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={()=>router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
    <Text style={styles.title}>Your progress 📊</Text><Text style={styles.sub}>Understand your workload before it becomes pressure.</Text>
    <View style={styles.score}><Text style={styles.scoreNum}>{score}%</Text><Text style={styles.scoreLabel}>Completion score</Text><View style={styles.bar}><View style={[styles.fill,{width:`${score}%`}]}/></View></View>
    <View style={styles.row}><Card icon="✅" value={done} label="Completed"/><Card icon="📋" value={pending.length} label="Pending"/><Card icon="⏱" value={`${planned.toFixed(1)}h`} label="Planned"/><Card icon="🔥" value={reward.streak||0} label="Streak"/></View>
    <View style={styles.insight}><Text style={styles.insightTitle}>{risk} workload • {insight}</Text><Text style={styles.insightText}>Available today: {available}h. Pending effort: {planned.toFixed(1)}h.</Text></View>
    <Text style={styles.section}>Upcoming deadlines</Text>
    {pending.length ? pending.slice(0,8).map(t=><View key={t.id} style={styles.task}><View style={{flex:1}}><Text style={styles.taskTitle}>{t.title}</Text><Text style={styles.taskMeta}>{Number(t.estimated_hours||0)}h • {t.priority||"Medium"}</Text></View><Text style={styles.due}>{dueText(t)}</Text></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing pending 🎉</Text><Text style={styles.emptyText}>Enjoy your buffer or add your next goal.</Text></View>}
  </ScrollView></SafeAreaView>;
}
function Card({icon,value,label}){return <View style={styles.card}><Text style={styles.icon}>{icon}</Text><Text style={styles.num}>{value}</Text><Text style={styles.label}>{label}</Text></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7FBF6"},container:{padding:22,maxWidth:850,width:"100%",alignSelf:"center"},load:{flex:1,alignItems:"center",justifyContent:"center"},back:{color:"#147A55",fontWeight:"800",fontSize:16},title:{fontSize:30,fontWeight:"900",color:"#173B2B",marginTop:22},sub:{color:"#728178",marginTop:5},score:{backgroundColor:"#E3F4E7",borderRadius:24,padding:22,marginTop:22},scoreNum:{fontSize:44,fontWeight:"900",color:"#147A55"},scoreLabel:{color:"#587163",fontWeight:"700"},bar:{height:12,backgroundColor:"#C9E3D0",borderRadius:10,marginTop:15,overflow:"hidden"},fill:{height:"100%",backgroundColor:"#147A55"},row:{flexDirection:"row",gap:9,flexWrap:"wrap",marginTop:12},card:{flex:1,minWidth:140,backgroundColor:"#fff",borderRadius:18,padding:15,borderWidth:1,borderColor:"#E3EDE4"},icon:{fontSize:21},num:{fontSize:23,fontWeight:"900",color:"#173B2B",marginTop:4},label:{color:"#7B8A82",fontSize:12},insight:{backgroundColor:"#FFF8E8",borderRadius:20,padding:18,marginTop:14},insightTitle:{fontSize:16,fontWeight:"900",color:"#5F4E27",lineHeight:22},insightText:{color:"#796C4E",marginTop:7},section:{fontSize:19,fontWeight:"900",color:"#173B2B",marginTop:24,marginBottom:10},task:{backgroundColor:"#fff",borderRadius:18,padding:15,flexDirection:"row",alignItems:"center",marginBottom:8,borderWidth:1,borderColor:"#E3EDE4"},taskTitle:{fontWeight:"900",color:"#243A2E"},taskMeta:{fontSize:12,color:"#7B8A82",marginTop:4},due:{fontWeight:"900",color:"#147A55"},empty:{backgroundColor:"#fff",borderRadius:18,padding:22,alignItems:"center"},emptyTitle:{fontWeight:"900",color:"#173B2B"},emptyText:{color:"#7B8A82",marginTop:5}});
