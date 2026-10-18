import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";

export default function SignIn() {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length > 0 && !busy;

  async function handleContinue() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(name);
    } catch (e) {
      console.warn(e);
      setError("Couldn't sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.wordmark}>RealityCheck</Text>
          <Text style={styles.tagline}>Quiet until your friends are here.</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.label}>What do your friends call you?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#3A3A46"
            maxLength={30}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleContinue}
            style={styles.input}
          />

          <Pressable
            style={[styles.button, !ready && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!ready}
          >
            {busy ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.buttonLabel}>Continue</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.legal}>
            RealityCheck never collects your location and never reads which apps
            you use.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingHorizontal: 24 },
  flex: { flex: 1 },
  hero: { flex: 1, justifyContent: "center" },
  wordmark: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  tagline: { color: "#8E8E9A", fontSize: 17, marginTop: 10, lineHeight: 24 },
  footer: { paddingBottom: 16, gap: 12 },
  label: { color: "#8E8E9A", fontSize: 15 },
  input: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    backgroundColor: "#15151C",
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 17,
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { color: "#0B0B0F", fontSize: 17, fontWeight: "600" },
  error: { color: "#FF5A5F", fontSize: 14, textAlign: "center" },
  legal: {
    color: "#5C5C68",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
