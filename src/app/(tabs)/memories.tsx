import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// TODO: swap PLACEHOLDER for a Firestore query scoped to the user's groups.

type Memory = { id: string; prompt: string; when: string; who: string[] };

const PLACEHOLDER: Memory[] = [];

export default function Memories() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Memories</Text>
      </View>

      <FlatList
        data={PLACEHOLDER}
        keyExtractor={(m) => m.id}
        contentContainerStyle={
          PLACEHOLDER.length === 0 ? styles.emptyWrap : styles.list
        }
        ListEmptyComponent={<Empty />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.prompt}>{item.prompt}</Text>
            <Text style={styles.meta}>
              {item.who.join(", ")} · {item.when}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Empty() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing yet</Text>
      <Text style={styles.emptyBody}>
        Challenges you complete together will collect here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
  },

  list: { padding: 20, gap: 12 },
  emptyWrap: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 6,
  },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  emptyBody: {
    color: "#6E6E7A",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },

  card: {
    backgroundColor: "#15151C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#23232D",
    padding: 16,
    gap: 6,
  },
  prompt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "#6E6E7A", fontSize: 13 },
});
