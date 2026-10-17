import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "@/features/auth/AuthContext";

export default function Settings() {
  const { signOut } = useAuth();
  const [quietHours, setQuietHours] = useState(true);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Section title="This group">
        <Row label="Quiet interval" value="20 min" />
        <Row label="Escalate after" value="40 min" />
        <ToggleRow
          label="Quiet hours"
          hint="No notifications 11pm – 8am"
          value={quietHours}
          onChange={setQuietHours}
        />
      </Section>

      <Section title="Privacy">
        <Row label="Location collected" value="None" />
        <Row label="App usage collected" value="None" />
      </Section>

      <Section title="Account">
        <Row label="Sign out" onPress={signOut} destructive />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  destructive,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <View style={styles.row} onTouchEnd={onPress}>
      <Text style={[styles.rowLabel, destructive && styles.destructive]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: "#0B0B0F" },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  section: { gap: 8 },
  sectionLabel: {
    color: "#6E6E7A",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
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
  rowLabel: { color: "#fff", fontSize: 16, flex: 1 },
  rowHint: { color: "#6E6E7A", fontSize: 13, marginTop: 2 },
  rowValue: { color: "#6E6E7A", fontSize: 16 },
  destructive: { color: "#FF5A5F" },
});
