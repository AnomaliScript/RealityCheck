import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// A prompt to make something, not a punishment. "Not now" is unpunished:
// the app never decides whether your reason was good enough.
export default function Challenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Challenge</Text>
        <Text style={styles.prompt}>
          Get everyone in one photo without anyone looking at a screen.
        </Text>
        <Text style={styles.who}>Maya, Dev and you are here</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => {
            // TODO: open expo-camera, then write the memory.
          }}
        >
          <Text style={styles.primaryLabel}>Capture</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={dismiss} hitSlop={8}>
          <Text style={styles.secondaryLabel}>Not now</Text>
        </Pressable>
      </View>

      {__DEV__ && <Text style={styles.debug}>challenge id: {id}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingHorizontal: 28 },
  body: { flex: 1, justifyContent: "center", gap: 18 },
  eyebrow: {
    color: "#35C77B",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  prompt: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  who: { color: "#6E6E7A", fontSize: 15 },

  actions: { paddingBottom: 20, gap: 8 },
  primary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75 },
  primaryLabel: { color: "#0B0B0F", fontSize: 17, fontWeight: "600" },
  secondary: { height: 48, alignItems: "center", justifyContent: "center" },
  secondaryLabel: { color: "#6E6E7A", fontSize: 16 },

  debug: {
    position: "absolute",
    top: 8,
    right: 12,
    color: "#2E2E3A",
    fontSize: 11,
  },
});
