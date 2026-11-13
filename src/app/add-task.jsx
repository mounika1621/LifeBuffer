import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function AddTask() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [deadline, setDeadline] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [difficulty, setDifficulty] = useState(3);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const saveTask = async () => {
    setSuccessMessage("");
    setErrorMessage("");

    // -----------------------------
    // Validation
    // -----------------------------
    if (!title.trim()) {
      setErrorMessage("Please enter a task title.");
      return;
    }

    if (!estimatedHours || Number(estimatedHours) <= 0) {
      setErrorMessage("Please enter a valid estimated effort.");
      return;
    }

    if (!deadline.trim()) {
      setErrorMessage("Please enter a due date.");
      return;
    }

    if (!dueTime.trim()) {
      setErrorMessage("Please enter a due time.");
      return;
    }

    // Basic date format check
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(deadline.trim())) {
      setErrorMessage("Use date format: YYYY-MM-DD");
      return;
    }

    // Basic time format check
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timePattern.test(dueTime.trim())) {
      setErrorMessage("Use time format: HH:MM");
      return;
    }

    try {
      setSaving(true);

      // -----------------------------
      // Get logged-in user
      // -----------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setErrorMessage("Your session has expired. Please login again.");
        return;
      }

      // -----------------------------
      // Create due timestamp
      // -----------------------------
      const dueAt = new Date(
        `${deadline.trim()}T${dueTime.trim()}:00`
      ).toISOString();

      // -----------------------------
      // Save task
      // -----------------------------
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        estimated_hours: Number(estimatedHours),
        deadline: deadline.trim(),
        due_at: dueAt,
        priority,
        difficulty: Number(difficulty),
        completed: false,
      });

      if (error) {
        throw error;
      }

      // -----------------------------
      // SUCCESS MESSAGE
      // -----------------------------
      setSuccessMessage("✅ Task saved successfully!");

      // Clear form
      setTitle("");
      setDescription("");
      setEstimatedHours("");
      setDeadline("");
      setDueTime("");
      setPriority("Medium");
      setDifficulty(3);

      // Give user time to see success message
      setTimeout(() => {
        router.replace("/");
      }, 1200);
    } catch (error) {
      console.error("Save task error:", error);

      setErrorMessage(
        error?.message || "Something went wrong while saving the task."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.smallTitle}>LIFEBUFFER</Text>
            <Text style={styles.title}>Add a task</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Give your task a realistic time and deadline.
        </Text>

        {/* SUCCESS MESSAGE */}
        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* ERROR MESSAGE */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Task title */}
        <View style={styles.section}>
          <Text style={styles.label}>Task title</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: DBMS Assignment"
            placeholderTextColor="#8A9A92"
            style={styles.input}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What needs to be completed?"
            placeholderTextColor="#8A9A92"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Estimated effort */}
        <View style={styles.section}>
          <Text style={styles.label}>Estimated effort</Text>

          <View style={styles.inputWithSuffix}>
            <TextInput
              value={estimatedHours}
              onChangeText={setEstimatedHours}
              placeholder="2"
              placeholderTextColor="#8A9A92"
              keyboardType="decimal-pad"
              style={styles.hoursInput}
            />

            <Text style={styles.suffix}>hours</Text>
          </View>
        </View>

        {/* Due date */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Due date</Text>

            <TextInput
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8A9A92"
              style={styles.input}
            />
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Due time</Text>

            <TextInput
              value={dueTime}
              onChangeText={setDueTime}
              placeholder="HH:MM"
              placeholderTextColor="#8A9A92"
              style={styles.input}
            />
          </View>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>

          <View style={styles.optionRow}>
            {["Low", "Medium", "High"].map((item) => (
              <Pressable
                key={item}
                onPress={() => setPriority(item)}
                style={[
                  styles.optionButton,
                  priority === item && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === item && styles.optionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.label}>Difficulty</Text>

          <View style={styles.optionRow}>
            {[1, 2, 3, 4, 5].map((number) => (
              <Pressable
                key={number}
                onPress={() => setDifficulty(number)}
                style={[
                  styles.difficultyButton,
                  difficulty === number && styles.difficultyActive,
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    difficulty === number && styles.difficultyTextActive,
                  ]}
                >
                  {number}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.helperText}>
            1 = Easy · 5 = Very difficult
          </Text>
        </View>

        {/* Save button */}
        <Pressable
          onPress={saveTask}
          disabled={saving || !!successMessage}
          style={[
            styles.saveButton,
            (saving || successMessage) && styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Task</Text>
          )}
        </Pressable>

        {/* Cancel */}
        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAF7",
  },

  content: {
    padding: 24,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7F2EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 30,
    color: "#123D2B",
    marginTop: -3,
  },

  smallTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#6D8579",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#123D2B",
    marginTop: 2,
  },

  subtitle: {
    fontSize: 15,
    color: "#708078",
    marginBottom: 24,
    lineHeight: 22,
  },

  successBox: {
    backgroundColor: "#DDF6E8",
    borderWidth: 1,
    borderColor: "#9ED7B5",
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
  },

  successText: {
    color: "#12633A",
    fontSize: 15,
    fontWeight: "700",
  },

  errorBox: {
    backgroundColor: "#FDE8E7",
    borderWidth: 1,
    borderColor: "#F2B8B5",
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
  },

  errorText: {
    color: "#A33A34",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  section: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#284A3A",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E5DE",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: "#173C2B",
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  inputWithSuffix: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E5DE",
    borderRadius: 14,
    paddingHorizontal: 15,
  },

  hoursInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#173C2B",
  },

  suffix: {
    color: "#728279",
    fontSize: 14,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },

  half: {
    flex: 1,
  },

  optionRow: {
    flexDirection: "row",
    gap: 10,
  },

  optionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E5DE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  optionButtonActive: {
    backgroundColor: "#147D5A",
    borderColor: "#147D5A",
  },

  optionText: {
    color: "#51665B",
    fontWeight: "700",
  },

  optionTextActive: {
    color: "#FFFFFF",
  },

  difficultyButton: {
    width: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E5DE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  difficultyActive: {
    backgroundColor: "#147D5A",
    borderColor: "#147D5A",
  },

  difficultyText: {
    color: "#51665B",
    fontWeight: "800",
  },

  difficultyTextActive: {
    color: "#FFFFFF",
  },

  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#809087",
  },

  saveButton: {
    backgroundColor: "#147D5A",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },

  cancelText: {
    color: "#597066",
    fontSize: 15,
    fontWeight: "700",
  },
});