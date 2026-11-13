import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const STAGES = [
  ["kid", "🌈", "Kid"],
  ["school", "📚", "School Student"],
  ["college", "🎓", "College Student"],
  ["professional", "💼", "Working Professional"],
  ["parent", "🏡", "Parent"],
  ["other", "✨", "Other"],
];

const THOUGHTS = {
  morning: [
    "You do not need a perfect day. You only need a good first step.",
    "Protect your first hour from unnecessary pressure. Start with what matters.",
    "A calm start can change the whole shape of your day.",
  ],
  day: [
    "Small progress still counts. Keep moving at a pace you can sustain.",
    "One finished task is better than ten postponed plans.",
    "Your time has value. Spend it on what moves you forward.",
  ],
  high: [
    "Your workload is heavy, not you. Let's make the plan lighter.",
    "You do not have to carry every task at once. Prioritize and breathe.",
    "A buffer is not wasted time. It is protection for your real life.",
  ],
  evening: [
    "You made progress today. Give yourself permission to slow down.",
    "Tomorrow deserves a rested version of you, not an exhausted one.",
    "Finish what matters, release what can wait, and rest without guilt.",
  ],
};

function thoughtFor(riskLabel) {
  const hour = new Date().getHours();
  const key = riskLabel === "HIGH" || riskLabel === "CRITICAL"
    ? "high"
    : hour < 11
      ? "morning"
      : hour >= 19
        ? "evening"
        : "day";
  const list = THOUGHTS[key];
  return list[new Date().getDate() % list.length];
}

function dueText(task) {
  const raw = task.due_at || `${task.deadline}T23:59:00`;
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) return `Due ${task.deadline}`;
  const diff = due.getTime() - Date.now();
  if (diff < 0) return "Overdue";
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, minutes)}m left`;
}

export default function Home() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState({ coins: 0, streak: 0, last_completed_date: null });
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [rescueModal, setRescueModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupTasks, setGroupTasks] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [sharedTitle, setSharedTitle] = useState("");
  const [name, setName] = useState("");
  const [stage, setStage] = useState("college");
  const [hours, setHours] = useState("4");
  const [saving, setSaving] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function start() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setSession(data.session);
      await loadData(data.session.user.id);
    }
    start();
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) setSession(next);
      else router.replace("/login");
    });
    return () => {
      active = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  async function loadData(userId) {
    setLoading(true);
    try {
      const [profileRes, taskRes, rewardRes, groupRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("tasks").select("*").eq("user_id", userId).order("due_at", { ascending: true }),
        supabase.from("user_rewards").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("group_members").select("group_id, groups(id,name,invite_code)").eq("user_id", userId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (taskRes.error) throw taskRes.error;
      if (rewardRes.error && rewardRes.error.code !== "PGRST116") throw rewardRes.error;

      setProfile(profileRes.data || null);
      setTasks(taskRes.data || []);
      setRewards(rewardRes.data || { coins: 0, streak: 0, last_completed_date: null });
      const loadedGroups = (groupRes.data || []).map(x => x.groups).filter(Boolean);
      setGroups(loadedGroups);
      if (loadedGroups.length) {
        setSelectedGroupId(loadedGroups[0].id);
        await loadGroupDetails(loadedGroups[0].id);
      } else {
        setGroupMembers([]);
        setGroupTasks([]);
      }

      if (profileRes.data) {
        setName(profileRes.data.name || "");
        setStage(profileRes.data.life_stage || "college");
        setHours(String(profileRes.data.daily_available_hours || 4));
      } else {
        setName(userId ? "" : "");
        setProfileModal(true);
      }
    } catch (error) {
      Alert.alert("LifeBuffer", error.message || "Could not load your data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupDetails(groupId) {
    if (!groupId) return;

    const [membersRes, tasksRes] = await Promise.all([
      supabase.rpc("get_group_members", { p_group_id: groupId }),
      supabase.from("group_tasks").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
    ]);

    if (!membersRes.error) setGroupMembers(membersRes.data || []);
    if (!tasksRes.error) setGroupTasks(tasksRes.data || []);
  }

  async function saveProfile() {
    if (!session) return;
    const available = Number(hours);
    if (!name.trim()) return Alert.alert("Name required", "Enter your name.");
    if (!available || available < 1 || available > 24) return Alert.alert("Invalid hours", "Use a value from 1 to 24.");
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      name: name.trim(),
      life_stage: stage,
      daily_available_hours: available,
    });
    setSaving(false);
    if (error) return Alert.alert("Could not save", error.message);
    setProfile({ id: session.user.id, name: name.trim(), life_stage: stage, daily_available_hours: available });
    setProfileModal(false);
  }

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed).length;
  const plannedHours = pending.reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);
  const availableHours = Number(profile?.daily_available_hours || hours || 4);
  const ratio = availableHours ? plannedHours / availableHours : 1.5;
  const risk = ratio >= 1.4 ? "CRITICAL" : ratio >= 1 ? "HIGH" : ratio >= 0.7 ? "MODERATE" : "SAFE";
  const thought = thoughtFor(risk);
  void clock;
  const firstName = (profile?.name || name || "there").split(" ")[0];
  const stageInfo = STAGES.find(x => x[0] === (profile?.life_stage || stage)) || STAGES[2];

  const rescueTasks = [...pending].sort((a, b) => {
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const priorityDiff = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (priorityDiff !== 0) return priorityDiff;
    const aDue = new Date(a.due_at || `${a.deadline}T23:59:00`).getTime();
    const bDue = new Date(b.due_at || `${b.deadline}T23:59:00`).getTime();
    return aDue - bDue;
  });

  const rescueOverload = Math.max(0, plannedHours - availableHours);
  const rescueMessage = risk === "SAFE"
    ? "Your workload is currently within your available time. Rescue Mode is ready if your schedule becomes heavy."
    : risk === "MODERATE"
      ? "You still have a buffer, but protect it by finishing the most urgent tasks first."
      : `You have about ${rescueOverload.toFixed(1)} extra hours of work. Rescue Mode puts urgent work first and protects your available time.`;

  async function toggleTask(task) {
    if (!session) return;
    const next = !task.completed;
    const { error } = await supabase.from("tasks").update({ completed: next }).eq("id", task.id).eq("user_id", session.user.id);
    if (error) return Alert.alert("Could not update task", error.message);
    setTasks(current => current.map(t => t.id === task.id ? { ...t, completed: next } : t));
    if (next) {
      const today = new Date().toISOString().slice(0, 10);
      const previous = rewards.last_completed_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = previous === yesterday ? Number(rewards.streak || 0) + 1 : previous === today ? Number(rewards.streak || 0) : 1;
      const newCoins = Number(rewards.coins || 0) + 10;
      const nextRewards = { ...rewards, coins: newCoins, streak: newStreak, last_completed_date: today };
      const rewardRes = await supabase.from("user_rewards").upsert({
        user_id: session.user.id,
        coins: newCoins,
        streak: newStreak,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      });
      if (!rewardRes.error) setRewards(nextRewards);
      Alert.alert("Task complete 🎉", `+10 LifeCoins\n🔥 ${newStreak} day streak`);
    }
  }

  async function createGroup() {
    if (!session || !groupName.trim()) return Alert.alert("Group name", "Enter a group name.");
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase.from("groups").insert({ name: groupName.trim(), owner_id: session.user.id, invite_code: code }).select().single();
    if (error) return Alert.alert("Could not create group", error.message);
    const memberRes = await supabase.from("group_members").insert({ group_id: data.id, user_id: session.user.id, role: "owner" });
    if (memberRes.error) {
      await supabase.from("groups").delete().eq("id", data.id);
      return Alert.alert("Could not create group", memberRes.error.message);
    }
    setGroups(old => [...old, data]);
    setSelectedGroupId(data.id);
    setGroupName("");
    await loadGroupDetails(data.id);
    Alert.alert("Group created 👥", `Invite code: ${code}`);
  }

  async function joinGroup() {
    if (!session || !joinCode.trim()) return Alert.alert("Invite code", "Enter the group code.");
    const { data, error } = await supabase.rpc("join_group_by_invite", { p_code: joinCode.trim().toUpperCase() });
    const joinedGroup = Array.isArray(data) ? data[0] : data;
    if (error || !joinedGroup) return Alert.alert("Could not join", error?.message || "That group code is not valid.");
    setGroups(old => old.some(g => g.id === joinedGroup.id) ? old : [...old, joinedGroup]);
    setSelectedGroupId(joinedGroup.id);
    setJoinCode("");
    await loadGroupDetails(joinedGroup.id);
    Alert.alert("You're in! 👥", `You joined ${joinedGroup.name}.`);
  }

  async function createSharedTask() {
    if (!session || !selectedGroupId || !sharedTitle.trim()) return Alert.alert("Shared task", "Choose a group and enter a task.");
    const { data, error } = await supabase.from("group_tasks").insert({ group_id: selectedGroupId, created_by: session.user.id, title: sharedTitle.trim(), estimated_hours: 1, completed: false }).select().single();
    if (error) return Alert.alert("Could not add shared task", error.message);
    setGroupTasks(old => [data, ...old]);
    setSharedTitle("");
    Alert.alert("Shared task added 👥", "Everyone in this group can now see this task.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setTasks([]); setGroups([]); setGroupMembers([]); setGroupTasks([]);
    router.replace("/login");
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.loader}><ActivityIndicator size="large" color="#147A55" /><Text style={styles.loaderText}>Loading your buffer…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>LIFEBUFFER</Text><Text style={styles.greeting}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},</Text><Text style={styles.name}>{firstName} 👋</Text></View>
          <Pressable style={styles.profileCircle} onPress={() => setProfileModal(true)}><Text style={styles.profileLetter}>{firstName.charAt(0).toUpperCase()}</Text></Pressable>
        </View>

        <View style={styles.thoughtCard}><Text style={styles.thoughtLabel}>💭 LIFE BUFFER THOUGHT</Text><Text style={styles.thought}>{thought}</Text></View>

        <View style={styles.hero}>
          <View style={{ flex: 1 }}><Text style={styles.heroKicker}>YOUR TIME MATTERS</Text><Text style={styles.heroTitle}>{risk === "SAFE" ? "You're in control." : "Let's protect your time."}</Text><Text style={styles.heroText}>{plannedHours.toFixed(1)}h planned from {availableHours}h available.</Text><Pressable style={styles.primaryButton} onPress={() => router.push("/add-task")}><Text style={styles.primaryText}>+ Add task</Text></Pressable></View>
          <View style={styles.riskCircle}><Text style={styles.riskPercent}>{Math.round(ratio * 100)}%</Text><Text style={styles.riskWord}>LOAD</Text></View>
        </View>

        <View style={styles.stats}>
          <Stat icon="✓" value={`${completed}/${tasks.length}`} label="Completed" />
          <Stat icon="⏱" value={`${plannedHours.toFixed(1)}h`} label="Planned" />
          <Stat icon="🪙" value={rewards.coins || 0} label="LifeCoins" />
          <Stat icon="🔥" value={rewards.streak || 0} label="Day streak" />
        </View>

        <View style={styles.sectionRow}><View><Text style={styles.sectionTitle}>Your tasks</Text><Text style={styles.sectionSub}>Every task gets its own due time.</Text></View><Pressable onPress={() => router.push("/add-task")}><Text style={styles.link}>+ Add</Text></Pressable></View>
        {pending.length === 0 ? <View style={styles.empty}><Text style={{ fontSize: 34 }}>🌿</Text><Text style={styles.emptyTitle}>Your buffer is clear</Text><Text style={styles.emptyText}>Add a task when you're ready.</Text></View> : pending.slice(0, 6).map(task => <Pressable key={task.id} style={styles.task} onPress={() => toggleTask(task)}><View style={styles.checkbox}><Text style={styles.checkText}>✓</Text></View><View style={{ flex: 1 }}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{Number(task.estimated_hours || 0)}h • {task.priority || "Medium"} • {dueText(task)}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}

        <View style={styles.twoCol}><Pressable style={styles.featureCard} onPress={() => router.push("/analytics")}><Text style={styles.featureIcon}>📊</Text><Text style={styles.featureTitle}>Analytics</Text><Text style={styles.featureSub}>Progress & workload</Text></Pressable><Pressable style={styles.featureCard} onPress={() => setRescueModal(true)}><Text style={styles.featureIcon}>🛟</Text><Text style={styles.featureTitle}>Rescue Mode</Text><Text style={styles.featureSub}>Make a heavy day lighter</Text></Pressable></View>

        <Pressable style={styles.groupCard} onPress={() => setGroupModal(true)}><Text style={styles.groupIcon}>👥</Text><View style={{ flex: 1 }}><Text style={styles.groupTitle}>Plan together</Text><Text style={styles.groupSub}>{groups.length ? `${groups.length} group${groups.length > 1 ? "s" : ""} joined` : "Create or join a group for shared goals"}</Text></View><Text style={styles.arrow}>›</Text></Pressable>

        <Pressable style={styles.proCard} onPress={() => router.push("/premium")}><View style={{ flex: 1 }}><Text style={styles.proSmall}>LIFEBUFFER PRO</Text><Text style={styles.proTitle}>AI planning + smarter rescue ✨</Text><Text style={styles.proText}>Try Pro for 3 days, then choose your plan.</Text></View><Text style={styles.proArrow}>›</Text></Pressable>

        <View style={styles.bottomNav}><Pressable onPress={() => {}}><Text style={styles.navIcon}>⌂</Text><Text style={styles.navText}>Home</Text></Pressable><Pressable onPress={() => router.push("/add-task")}><Text style={styles.navIcon}>＋</Text><Text style={styles.navText}>Task</Text></Pressable><Pressable onPress={() => router.push("/analytics")}><Text style={styles.navIcon}>◔</Text><Text style={styles.navText}>Analytics</Text></Pressable><Pressable onPress={() => router.push("/premium")}><Text style={styles.navIcon}>★</Text><Text style={styles.navText}>Pro</Text></Pressable><Pressable onPress={logout}><Text style={styles.navIcon}>↪</Text><Text style={styles.navText}>Logout</Text></Pressable></View>
      </ScrollView>

      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}><View style={styles.shade}><View style={styles.modal}><Text style={styles.modalTitle}>Your LifeBuffer profile 🌱</Text><Text style={styles.modalSub}>We use your life stage and real available hours to make workload estimates more realistic.</Text><Text style={styles.label}>Name</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name"/><Text style={styles.label}>Life stage</Text><View style={styles.stageGrid}>{STAGES.map(x => <Pressable key={x[0]} onPress={() => setStage(x[0])} style={[styles.stage, stage === x[0] && styles.stageActive]}><Text style={{ fontSize: 20 }}>{x[1]}</Text><Text style={styles.stageText}>{x[2]}</Text></Pressable>)}</View><Text style={styles.label}>Available hours per day</Text><TextInput value={hours} onChangeText={setHours} keyboardType="numeric" style={styles.input}/><Pressable style={styles.primaryButtonFull} onPress={saveProfile} disabled={saving}><Text style={styles.primaryText}>{saving ? "Saving…" : "Save profile"}</Text></Pressable><Pressable onPress={() => setProfileModal(false)}><Text style={styles.cancel}>Close</Text></Pressable></View></View></Modal>

      <Modal visible={rescueModal} transparent animationType="slide" onRequestClose={() => setRescueModal(false)}>
        <View style={styles.shade}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>Rescue Mode 🛟</Text>
              <Text style={styles.modalSub}>{rescueMessage}</Text>

              <Text style={styles.label}>Current workload</Text>
              <View style={styles.groupRow}>
                <Text style={styles.groupRowName}>{plannedHours.toFixed(1)}h planned • {availableHours}h available</Text>
                <Text style={styles.groupCode}>{risk} workload</Text>
              </View>

              <Text style={styles.label}>Rescue plan</Text>
              <View style={styles.sharedTask}>
                <Text style={styles.groupRowName}>1. Protect urgent deadlines</Text>
                <Text style={styles.groupCode}>Start with High-priority tasks and the earliest due time.</Text>
              </View>
              <View style={styles.sharedTask}>
                <Text style={styles.groupRowName}>2. Keep your time buffer</Text>
                <Text style={styles.groupCode}>Do not fill every available hour. Leave room for real-life interruptions.</Text>
              </View>
              <View style={styles.sharedTask}>
                <Text style={styles.groupRowName}>3. Defer optional work</Text>
                <Text style={styles.groupCode}>Medium and Low priority tasks can wait until urgent work is under control.</Text>
              </View>

              <Text style={styles.label}>Recommended order</Text>
              {rescueTasks.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={{ fontSize: 30 }}>🌿</Text>
                  <Text style={styles.emptyTitle}>Nothing to rescue</Text>
                  <Text style={styles.emptyText}>Add some tasks and Rescue Mode will prioritize them automatically.</Text>
                </View>
              ) : (
                rescueTasks.slice(0, 8).map((task, index) => (
                  <View key={task.id} style={styles.sharedTask}>
                    <Text style={styles.groupRowName}>{index + 1}. {task.title}</Text>
                    <Text style={styles.groupCode}>{Number(task.estimated_hours || 0)}h • {task.priority || "Medium"} • {dueText(task)}</Text>
                  </View>
                ))
              )}

              <Pressable style={styles.primaryButtonFull} onPress={() => setRescueModal(false)}>
                <Text style={styles.primaryText}>Got it — start with the first task</Text>
              </Pressable>
              <Pressable onPress={() => setRescueModal(false)}>
                <Text style={styles.cancel}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={groupModal} transparent animationType="slide" onRequestClose={() => setGroupModal(false)}><View style={styles.shade}><View style={styles.modal}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}><Text style={styles.modalTitle}>Plan together 👥</Text><Text style={styles.modalSub}>Create a study group, project team, family goal or shared deadline space.</Text><Text style={styles.label}>Create a group</Text><TextInput value={groupName} onChangeText={setGroupName} style={styles.input} placeholder="e.g. Final Year Project"/><Pressable style={styles.primaryButtonFull} onPress={createGroup}><Text style={styles.primaryText}>Create group</Text></Pressable><Text style={styles.or}>OR JOIN WITH INVITE CODE</Text><TextInput value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" style={styles.input} placeholder="ABC123"/><Pressable style={styles.secondaryButton} onPress={joinGroup}><Text style={styles.secondaryText}>Join group</Text></Pressable>{groups.map(g => <Pressable key={g.id} onPress={async () => { setSelectedGroupId(g.id); await loadGroupDetails(g.id); }} style={[styles.groupRow, selectedGroupId === g.id && styles.groupSelected]}><Text style={styles.groupRowName}>👥 {g.name}</Text><Text style={styles.groupCode}>Code: {g.invite_code} {selectedGroupId === g.id ? "• Selected" : ""}</Text></Pressable>)}
          {groups.length > 0 && <><Text style={styles.label}>Team members</Text>
          {groupMembers.length === 0 ? <Text style={styles.groupCode}>No members found.</Text> : groupMembers.map((m, index) => <View key={m.user_id || index} style={styles.memberRow}><View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{(m.name || "U").charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.groupRowName}>{m.name || "LifeBuffer user"}</Text><Text style={styles.groupCode}>{m.role === "owner" ? "Group owner" : "Member"}</Text></View></View>)}
          <Text style={styles.label}>Add a shared task</Text><TextInput value={sharedTitle} onChangeText={setSharedTitle} style={styles.input} placeholder="e.g. Submit project together"/><Pressable style={styles.primaryButtonFull} onPress={createSharedTask}><Text style={styles.primaryText}>Add shared task</Text></Pressable>{groupTasks.slice(0,5).map(t=><View key={t.id} style={styles.sharedTask}><Text style={styles.groupRowName}>☑ {t.title}</Text><Text style={styles.groupCode}>Shared group task</Text></View>)}</>}<Pressable onPress={() => setGroupModal(false)}><Text style={styles.cancel}>Close</Text></Pressable></ScrollView></View></View></Modal>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }) { return <View style={styles.stat}><Text style={styles.statIcon}>{icon}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F5F9F6"},content:{padding:20,paddingBottom:40,maxWidth:900,width:"100%",alignSelf:"center"},loader:{flex:1,alignItems:"center",justifyContent:"center"},loaderText:{marginTop:10,color:"#6C7C73"},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},eyebrow:{fontSize:11,fontWeight:"900",letterSpacing:2,color:"#7A8E84"},greeting:{fontSize:17,color:"#63736B",marginTop:4},name:{fontSize:29,fontWeight:"900",color:"#173B2B"},profileCircle:{width:48,height:48,borderRadius:24,backgroundColor:"#DDEDE4",alignItems:"center",justifyContent:"center"},profileLetter:{fontSize:19,fontWeight:"900",color:"#147A55"},thoughtCard:{backgroundColor:"#FFF7DE",borderRadius:22,padding:18,marginBottom:14},thoughtLabel:{fontSize:11,fontWeight:"900",letterSpacing:1,color:"#866B2A"},thought:{fontSize:17,lineHeight:24,fontWeight:"700",color:"#3F493F",marginTop:8},hero:{backgroundColor:"#DFF2E5",borderRadius:26,padding:20,flexDirection:"row",alignItems:"center"},heroKicker:{fontSize:10,fontWeight:"900",letterSpacing:1.5,color:"#668071"},heroTitle:{fontSize:23,fontWeight:"900",color:"#173B2B",marginTop:4},heroText:{color:"#5C7165",marginTop:5},primaryButton:{backgroundColor:"#147A55",borderRadius:14,paddingHorizontal:16,paddingVertical:11,alignSelf:"flex-start",marginTop:14},primaryText:{color:"#fff",fontWeight:"900"},riskCircle:{width:82,height:82,borderRadius:41,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",marginLeft:10},riskPercent:{fontSize:19,fontWeight:"900",color:"#173B2B"},riskWord:{fontSize:9,fontWeight:"900",color:"#718078"},stats:{flexDirection:"row",gap:9,marginTop:12,flexWrap:"wrap"},stat:{flex:1,minWidth:130,backgroundColor:"#fff",borderRadius:18,padding:14,borderWidth:1,borderColor:"#E4ECE6"},statIcon:{fontSize:19},statValue:{fontSize:20,fontWeight:"900",color:"#173B2B",marginTop:5},statLabel:{fontSize:11,color:"#7B8B82",marginTop:2},sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:22,marginBottom:10},sectionTitle:{fontSize:19,fontWeight:"900",color:"#173B2B"},sectionSub:{fontSize:12,color:"#7B8B82",marginTop:3},link:{color:"#147A55",fontWeight:"900"},empty:{backgroundColor:"#fff",borderRadius:20,padding:24,alignItems:"center"},emptyTitle:{fontWeight:"900",fontSize:17,color:"#173B2B",marginTop:6},emptyText:{color:"#7B8B82",marginTop:4},task:{backgroundColor:"#fff",borderRadius:18,padding:14,flexDirection:"row",alignItems:"center",marginBottom:8,borderWidth:1,borderColor:"#E4ECE6"},checkbox:{width:28,height:28,borderRadius:9,borderWidth:1.5,borderColor:"#9EC3AD",alignItems:"center",justifyContent:"center",marginRight:12},checkText:{color:"#147A55",fontWeight:"900"},taskTitle:{fontWeight:"900",color:"#243B2E"},taskMeta:{fontSize:12,color:"#7B8B82",marginTop:4},arrow:{fontSize:27,color:"#A2AEA8"},twoCol:{flexDirection:"row",gap:10,marginTop:14},featureCard:{flex:1,backgroundColor:"#EEF5FF",borderRadius:20,padding:16},featureIcon:{fontSize:25},featureTitle:{fontWeight:"900",color:"#29414F",marginTop:7},featureSub:{fontSize:12,color:"#778791",marginTop:3},groupCard:{marginTop:14,backgroundColor:"#EEE9FF",borderRadius:22,padding:17,flexDirection:"row",alignItems:"center"},groupIcon:{fontSize:28,marginRight:12},groupTitle:{fontWeight:"900",fontSize:16,color:"#44386F"},groupSub:{fontSize:12,color:"#746A94",marginTop:4},proCard:{marginTop:14,backgroundColor:"#182A24",borderRadius:22,padding:18,flexDirection:"row",alignItems:"center"},proSmall:{fontSize:10,fontWeight:"900",letterSpacing:1.5,color:"#A6D9BE"},proTitle:{fontSize:17,fontWeight:"900",color:"#fff",marginTop:5},proText:{fontSize:12,color:"#B9CDC3",marginTop:4},proArrow:{fontSize:31,color:"#fff"},bottomNav:{marginTop:20,paddingTop:15,borderTopWidth:1,borderTopColor:"#E1EAE3",flexDirection:"row",justifyContent:"space-around"},navIcon:{fontSize:18,textAlign:"center"},navText:{fontSize:10,color:"#718078",textAlign:"center",marginTop:3},shade:{flex:1,backgroundColor:"rgba(10,25,18,.5)",justifyContent:"flex-end"},modal:{backgroundColor:"#F5F9F6",borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,maxHeight:"92%"},modalTitle:{fontSize:23,fontWeight:"900",color:"#173B2B"},modalSub:{color:"#718078",lineHeight:19,marginTop:5,marginBottom:12},label:{fontWeight:"900",color:"#294A3A",marginTop:10,marginBottom:6},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE7DE",borderRadius:14,padding:13,color:"#173B2B"},stageGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},stage:{width:"31.5%",backgroundColor:"#fff",borderWidth:1,borderColor:"#E1EAE3",borderRadius:14,padding:10},stageActive:{borderColor:"#147A55",backgroundColor:"#E4F5E9"},stageText:{fontSize:11,fontWeight:"800",color:"#274436",marginTop:4},primaryButtonFull:{backgroundColor:"#147A55",borderRadius:14,padding:15,alignItems:"center",marginTop:16},secondaryButton:{backgroundColor:"#fff",borderWidth:1,borderColor:"#147A55",borderRadius:14,padding:14,alignItems:"center",marginTop:10},secondaryText:{color:"#147A55",fontWeight:"900"},cancel:{textAlign:"center",color:"#6D7C74",fontWeight:"800",padding:14},or:{fontSize:10,fontWeight:"900",letterSpacing:1.3,color:"#87948D",marginTop:20,marginBottom:5},groupRow:{backgroundColor:"#fff",borderRadius:14,padding:12,marginTop:8},memberRow:{backgroundColor:"#fff",borderRadius:14,padding:10,marginTop:8,flexDirection:"row",alignItems:"center"},memberAvatar:{width:38,height:38,borderRadius:19,backgroundColor:"#DDEDE4",alignItems:"center",justifyContent:"center",marginRight:10},memberAvatarText:{fontWeight:"900",color:"#147A55"},groupSelected:{borderWidth:1.5,borderColor:"#147A55",backgroundColor:"#E8F5EC"},sharedTask:{backgroundColor:"#fff",borderRadius:14,padding:12,marginTop:8,borderLeftWidth:3,borderLeftColor:"#147A55"},groupRowName:{fontWeight:"900",color:"#294A3A"},groupCode:{fontSize:11,color:"#728178",marginTop:3}
});
