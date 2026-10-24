import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";
import { deleteMemory } from "@/features/challenges/challenges";
import { useMemories, type Memory } from "@/features/memories/useMemories";

function formatWhen(ms: number) {
  const d = new Date(ms);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

export default function Memories() {
  const { user } = useAuth();
  const { memories, loading } = useMemories();

  function confirmDelete(m: Memory) {
    if (m.authorUid !== user?.uid) return;
    Alert.alert("Delete this memory?", "It will be removed for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMemory(m.id).catch((e) => console.warn(e));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Memories</Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(m) => m.id}
          contentContainerStyle={
            memories.length === 0 ? styles.emptyWrap : styles.list
          }
          ListEmptyComponent={<Empty />}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => confirmDelete(item)}
              style={styles.card}
            >
              {item.photo ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.photo}` }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.cardBody}>
                <Text style={styles.prompt}>{item.prompt}</Text>
                {item.text ? (
                  <Text style={styles.answer}>{item.text}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {item.authorName} · {formatWhen(item.createdAt)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
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

  list: { padding: 20, gap: 16, paddingBottom: 48 },
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#23232D",
    overflow: "hidden",
  },
  photo: { width: "100%", aspectRatio: 4 / 5, backgroundColor: "#000" },
  cardBody: { padding: 16, gap: 6 },
  prompt: { color: "#8E8E9A", fontSize: 14, lineHeight: 19 },
  answer: { color: "#fff", fontSize: 18, lineHeight: 25, fontWeight: "500" },
  meta: { color: "#5C5C68", fontSize: 13, marginTop: 2 },
});
