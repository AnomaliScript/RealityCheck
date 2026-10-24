import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import {
  preparePhoto,
  saveMemory,
  type PreparedPhoto,
} from "@/features/challenges/challenges";
import { useHangout } from "@/features/hangouts/useHangout";
import { markChallengeHandled } from "@/features/session/useActiveChallenge";

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A prompt to make something, not a punishment. "Not now" is never penalized:
 * the app doesn't decide whether your reason was good enough.
 */
export default function Challenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { hangout, loading } = useHangout();

  const challenge =
    hangout?.challenge && hangout.challenge.id === id
      ? hangout.challenge
      : null;

  function close() {
    if (id) markChallengeHandled(id);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hangout || !challenge || !user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.body}>This challenge has passed.</Text>
          <Pressable style={styles.secondary} onPress={close}>
            <Text style={styles.secondaryLabel}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const others = hangout.members
    .filter((m) => m.id !== user.uid)
    .map((m) => m.name);
  const whoLine =
    others.length === 0 ? "Just you so far" : `${joinNames(others)} and you`;

  async function submit(payload: { text?: string; photo?: string }) {
    await saveMemory({
      hangoutId: hangout!.id,
      challengeId: challenge!.id,
      prompt: challenge!.prompt,
      kind: challenge!.kind,
      author: user!,
      audience: hangout!.members.map((m) => m.id),
      ...payload,
    });
    close();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.top}>
          <Text style={styles.eyebrow}>
            {challenge.kind === "photo" ? "Photo challenge" : "Challenge"}
          </Text>
          <Text style={styles.prompt}>{challenge.prompt}</Text>
          <Text style={styles.who}>{whoLine}</Text>
        </View>

        {challenge.kind === "photo" ? (
          <PhotoResponse
            onSubmit={(photo) => submit({ photo })}
            onSkip={close}
          />
        ) : (
          <TextResponse onSubmit={(text) => submit({ text })} onSkip={close} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhotoResponse({
  onSubmit,
  onSkip,
}: {
  onSubmit: (base64: string) => Promise<void>;
  onSkip: () => void;
}) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [shot, setShot] = useState<PreparedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.bottom}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.bottom}>
        <Text style={styles.body}>
          RealityCheck needs the camera for photo challenges.
        </Text>
        <Pressable style={styles.primary} onPress={() => requestPermission()}>
          <Text style={styles.primaryLabel}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onSkip}>
          <Text style={styles.secondaryLabel}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  async function capture() {
    if (!camera.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const pic = await camera.current.takePictureAsync({
        quality: 1,
        exif: false,
      });
      if (!pic?.uri) throw new Error("No photo returned");
      setShot(await preparePhoto(pic.uri));
    } catch (e) {
      console.warn(e);
      setError("Couldn't take the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!shot || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(shot.base64);
    } catch (e) {
      console.warn(e);
      setError("Couldn't save. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <View style={styles.bottom}>
      <View style={styles.viewfinder}>
        {shot ? (
          <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing={facing}
            />
            <Pressable
              style={styles.flip}
              hitSlop={8}
              onPress={() => setFacing(facing === "back" ? "front" : "back")}
            >
              <Text style={styles.flipLabel}>Flip</Text>
            </Pressable>
          </>
        )}
      </View>

      {shot ? (
        <>
          <Pressable
            style={[styles.primary, busy && styles.dimmed]}
            disabled={busy}
            onPress={share}
          >
            {busy ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.primaryLabel}>Share with the group</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.secondary}
            disabled={busy}
            onPress={() => setShot(null)}
          >
            <Text style={styles.secondaryLabel}>Retake</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={[styles.primary, busy && styles.dimmed]}
            disabled={busy}
            onPress={capture}
          >
            {busy ? (
              <ActivityIndicator color="#0B0B0F" />
            ) : (
              <Text style={styles.primaryLabel}>Capture</Text>
            )}
          </Pressable>
          <Pressable style={styles.secondary} onPress={onSkip}>
            <Text style={styles.secondaryLabel}>Not now</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TextResponse({
  onSubmit,
  onSkip,
}: {
  onSubmit: (text: string) => Promise<void>;
  onSkip: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim().length > 0 && !busy;

  async function share() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim());
    } catch (e) {
      console.warn(e);
      setError("Couldn't save. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <View style={styles.bottom}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Your answer"
        placeholderTextColor="#3A3A46"
        multiline
        maxLength={500}
        style={styles.textArea}
      />
      <Pressable
        style={[styles.primary, !ready && styles.dimmed]}
        disabled={!ready}
        onPress={share}
      >
        {busy ? (
          <ActivityIndicator color="#0B0B0F" />
        ) : (
          <Text style={styles.primaryLabel}>Share with the group</Text>
        )}
      </Pressable>
      <Pressable style={styles.secondary} onPress={onSkip}>
        <Text style={styles.secondaryLabel}>Not now</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F", paddingHorizontal: 24 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  top: { paddingTop: 24, paddingBottom: 20, gap: 12 },
  eyebrow: {
    color: "#35C77B",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  prompt: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "600",
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  who: { color: "#6E6E7A", fontSize: 15 },
  body: { color: "#8E8E9A", fontSize: 15, textAlign: "center", lineHeight: 21 },

  bottom: { flex: 1, justifyContent: "flex-end", gap: 10, paddingBottom: 16 },
  viewfinder: {
    flex: 1,
    minHeight: 240,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 6,
  },
  flip: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  flipLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },

  textArea: {
    flex: 1,
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    backgroundColor: "#15151C",
    color: "#fff",
    fontSize: 18,
    lineHeight: 25,
    padding: 16,
    textAlignVertical: "top",
    marginBottom: 6,
  },

  primary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: "#0B0B0F", fontSize: 17, fontWeight: "600" },
  secondary: { height: 48, alignItems: "center", justifyContent: "center" },
  secondaryLabel: { color: "#6E6E7A", fontSize: 16 },
  dimmed: { opacity: 0.4 },
  error: { color: "#FF5A5F", fontSize: 14, textAlign: "center" },
});
