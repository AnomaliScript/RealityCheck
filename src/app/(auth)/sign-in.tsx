import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";

export default function SignIn() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>RealityCheck</Text>
        <Text style={styles.tagline}>Quiet until your friends are here.</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSignIn}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Continue with Apple</Text>
          )}
        </Pressable>

        <Text style={styles.legal}>
          RealityCheck never collects your location and never reads which apps
          you use.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingHorizontal: 24 },
  hero: { flex: 1, justifyContent: "center" },
  wordmark: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  tagline: { color: "#8E8E9A", fontSize: 17, marginTop: 10, lineHeight: 24 },
  footer: { paddingBottom: 16, gap: 16 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.75 },
  buttonLabel: { color: "#0B0B0F", fontSize: 17, fontWeight: "600" },
  legal: {
    color: "#5C5C68",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
