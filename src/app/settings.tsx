import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import type { ChallengeKind } from "@/features/challenges/pool";
import {
  INTERVAL_OPTIONS,
  MAX_PROMPT_LENGTH,
  addCustomChallenge,
  removeCustomChallenge,
  setChallengeInterval,
  useSettings,
} from "@/features/settings/settings";

export default function Settings() {
  const { signOut } = useAuth();
  const { challengeIntervalMin, customChallenges } = useSettings();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Section title="Challenge interval">
        <View style={styles.chips}>
          {INTERVAL_OPTIONS.map((min) => {
            const selected = min === challengeIntervalMin;
            return (
              <Pressable
                key={min}
                onPress={() => setChallengeInterval(min)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text
                  style={[styles.chipLabel, selected && styles.chipLabelOn]}
                >
                  {min < 60 ? `${min} min` : "1 hr"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>
          A challenge arrives after this long without one. If friends pick
          different intervals, the shortest one wins.
        </Text>
      </Section>

      <Section title="Your challenges">
        <View style={styles.card}>
          {customChallenges.length === 0 ? (
            <Text style={styles.empty}>
              None yet. Add your own below: they come up about half the time.
            </Text>
          ) : (
            customChallenges.map((c, i) => (
              <View key={c.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.kindTag}>
                  {c.kind === "photo" ? "PHOTO" : "TEXT"}
                </Text>
                <Text style={styles.rowText}>{c.prompt}</Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => removeCustomChallenge(c.id)}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <AddChallenge />
      </Section>

      <Section title="Privacy">
        <View style={styles.card}>
          <InfoRow label="Location" value="Scrambled, hangouts only" />
          <InfoRow label="Location collected" value="None" />
          <InfoRow label="App usage collected" value="None" divider />
        </View>
      </Section>

      <Section title="Account">
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={signOut}>
            <Text style={[styles.rowText, styles.destructive]}>Sign out</Text>
          </Pressable>
        </View>
      </Section>
    </ScrollView>
  );
}

function AddChallenge() {
  const [kind, setKind] = useState<ChallengeKind>("photo");
  const [prompt, setPrompt] = useState("");
  const ready = prompt.trim().length > 0;

  function add() {
    if (!ready) return;
    addCustomChallenge(kind, prompt);
    setPrompt("");
  }

  return (
    <View style={styles.addBox}>
      <View style={styles.segment}>
        {(["photo", "text"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={[styles.segmentButton, kind === k && styles.segmentButtonOn]}
          >
            <Text
              style={[styles.segmentLabel, kind === k && styles.segmentLabelOn]}
            >
              {k === "photo" ? "Photo" : "Text"}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder={
          kind === "photo"
            ? "e.g. Everyone mid-jump in one photo"
            : "e.g. Best thing you ate this week?"
        }
        placeholderTextColor="#3A3A46"
        maxLength={MAX_PROMPT_LENGTH}
        multiline
        style={styles.input}
      />

      <Pressable
        style={[styles.addButton, !ready && styles.dimmed]}
        disabled={!ready}
        onPress={add}
      >
        <Text style={styles.addLabel}>Add challenge</Text>
      </Pressable>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: "#0B0B0F" },
  content: { padding: 20, gap: 28, paddingBottom: 48 },

  section: { gap: 10 },
  sectionLabel: {
    color: "#6E6E7A",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  note: { color: "#6E6E7A", fontSize: 13, lineHeight: 18 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  chipLabel: { color: "#8E8E9A", fontSize: 14, fontWeight: "600" },
  chipLabelOn: { color: "#0B0B0F" },

  card: {
    backgroundColor: "#15151C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#23232D",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 52,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#23232D" },
  rowText: { color: "#fff", fontSize: 15, lineHeight: 20, flex: 1 },
  rowValue: { color: "#6E6E7A", fontSize: 15 },
  kindTag: {
    color: "#35C77B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    width: 44,
  },
  remove: { color: "#FF5A5F", fontSize: 14, fontWeight: "500" },
  empty: { color: "#6E6E7A", fontSize: 14, padding: 16, lineHeight: 20 },
  destructive: { color: "#FF5A5F" },

  addBox: { gap: 10 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#15151C",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#23232D",
  },
  segmentButton: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonOn: { backgroundColor: "#2A2A35" },
  segmentLabel: { color: "#6E6E7A", fontSize: 14, fontWeight: "600" },
  segmentLabelOn: { color: "#fff" },
  input: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    backgroundColor: "#15151C",
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    padding: 14,
    textAlignVertical: "top",
  },
  addButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { color: "#0B0B0F", fontSize: 16, fontWeight: "600" },
  dimmed: { opacity: 0.4 },
});
