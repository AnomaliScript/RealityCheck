import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { useAuth } from "@/features/auth/AuthContext";
import {
  CODE_LENGTH,
  QR_PREFIX,
  endHangout,
  hangoutMessage,
  joinHangout,
  leaveHangout,
  startHangout,
} from "@/features/hangouts/hangouts";
import { useHangout, type Hangout } from "@/features/hangouts/useHangout";

/**
 * One screen, driven by state: if you're in a hangout it shows the code and
 * who's here; otherwise it lets you start one or join one.
 */
export default function HangoutScreen() {
  const { hangout, loading } = useHangout();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {hangout ? <InHangout hangout={hangout} /> : <NotInHangout />}
    </ScrollView>
  );
}

function InHangout({ hangout }: { hangout: Hangout }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHost = user?.uid === hangout.hostUid;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(hangoutMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function confirmEnd() {
    const end = () => run(() => endHangout(hangout.id));
    // Alert buttons don't fire on web, so skip the confirmation there.
    if (Platform.OS === "web") {
      end();
      return;
    }
    Alert.alert("End the hangout?", "This ends it for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "End hangout", style: "destructive", onPress: end },
    ]);
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>You’re in a hangout</Text>

      <View style={styles.qrWrap}>
        <QRCode
          value={QR_PREFIX + hangout.code}
          size={200}
          color="#0B0B0F"
          backgroundColor="#FFFFFF"
        />
      </View>

      <Text style={styles.code}>
        {hangout.code.slice(0, 3)} {hangout.code.slice(3)}
      </Text>
      <Text style={styles.hint}>
        Anyone with this code can join until the hangout ends.
      </Text>

      <Text style={styles.sectionLabel}>
        Here now · {hangout.members.length}
      </Text>
      <View style={styles.card}>
        {hangout.members.map((m, i) => (
          <View key={m.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <Text style={styles.rowName}>{m.name}</Text>
            <Text style={styles.rowTag}>
              {[
                m.id === hangout.hostUid ? "host" : null,
                m.id === user?.uid ? "you" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.secondary, busy && styles.dimmed]}
        disabled={busy}
        onPress={() => {
          if (user) run(() => leaveHangout(hangout.id, user.uid));
        }}
      >
        <Text style={styles.secondaryLabel}>Leave hangout</Text>
      </Pressable>

      {isHost ? (
        <Pressable
          style={[styles.destructive, busy && styles.dimmed]}
          disabled={busy}
          onPress={confirmEnd}
        >
          <Text style={styles.destructiveLabel}>End for everyone</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type Mode = "start" | "join";

function NotInHangout() {
  const [mode, setMode] = useState<Mode>("start");

  return (
    <View style={styles.panel}>
      <View style={styles.segment}>
        <SegmentButton
          label="Start"
          active={mode === "start"}
          onPress={() => setMode("start")}
        />
        <SegmentButton
          label="Join"
          active={mode === "join"}
          onPress={() => setMode("join")}
        />
      </View>

      {mode === "start" ? <StartPanel /> : <JoinPanel />}
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StartPanel() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      // No navigation needed: the live listener sees the new hangout
      // and this screen switches to the in-hangout view on its own.
      await startHangout(user);
    } catch (e) {
      setError(hangoutMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>
        Start a hangout and your friends join with a code. It ends when you all
        drift apart, or when you end it.
      </Text>

      <Pressable
        style={[styles.primary, busy && styles.dimmed]}
        disabled={busy}
        onPress={start}
      >
        {busy ? (
          <ActivityIndicator color="#0B0B0F" />
        ) : (
          <Text style={styles.primaryLabel}>Start a hangout</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function JoinPanel() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // The camera fires many scan events per second; only act on the first.
  const scanLock = useRef(false);

  async function submit(input: string) {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Same as Start: the listener switches the screen once you're in.
      await joinHangout(input, user);
    } catch (e) {
      setError(hangoutMessage(e));
      scanLock.current = false;
    } finally {
      setBusy(false);
    }
  }

  async function startScanning() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError("Camera access is off. You can still type the code.");
        return;
      }
    }
    setError(null);
    scanLock.current = false;
    setScanning(true);
  }

  const canSubmit = code.length === CODE_LENGTH && !busy;

  return (
    <View style={styles.panel}>
      {scanning ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (scanLock.current || !data.startsWith(QR_PREFIX)) return;
              scanLock.current = true;
              setScanning(false);
              submit(data);
            }}
          />
        </View>
      ) : (
        <Pressable style={styles.secondary} onPress={startScanning}>
          <Text style={styles.secondaryLabel}>Scan a hangout QR code</Text>
        </Pressable>
      )}

      <Text style={styles.or}>or type the code</Text>

      <TextInput
        value={code}
        onChangeText={(t) =>
          setCode(
            t
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, CODE_LENGTH),
          )
        }
        placeholder="ABC123"
        placeholderTextColor="#3A3A46"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CODE_LENGTH}
        returnKeyType="go"
        onSubmitEditing={() => canSubmit && submit(code)}
        style={styles.input}
      />

      <Pressable
        style={[styles.primary, !canSubmit && styles.dimmed]}
        disabled={!canSubmit}
        onPress={() => submit(code)}
      >
        {busy ? (
          <ActivityIndicator color="#0B0B0F" />
        ) : (
          <Text style={styles.primaryLabel}>Join</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: "#0B0B0F" },
  content: { padding: 20, gap: 24, paddingBottom: 48 },
  center: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
  },

  panel: { gap: 16, alignItems: "stretch" },
  heading: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: { color: "#8E8E9A", fontSize: 15, lineHeight: 22, textAlign: "center" },

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
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: { backgroundColor: "#2A2A35" },
  segmentLabel: { color: "#6E6E7A", fontSize: 15, fontWeight: "600" },
  segmentLabelActive: { color: "#fff" },

  qrWrap: {
    alignSelf: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  code: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  hint: { color: "#8E8E9A", fontSize: 15, textAlign: "center", lineHeight: 21 },
  dimmed: { opacity: 0.35 },

  sectionLabel: {
    color: "#6E6E7A",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
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
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#23232D" },
  rowName: { color: "#fff", fontSize: 16, flex: 1 },
  rowTag: { color: "#6E6E7A", fontSize: 14 },

  cameraWrap: {
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  or: { color: "#6E6E7A", fontSize: 14, textAlign: "center" },
  input: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    backgroundColor: "#15151C",
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },

  primary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: "#0B0B0F", fontSize: 17, fontWeight: "600" },
  secondary: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  destructive: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#4A1F22",
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveLabel: { color: "#FF5A5F", fontSize: 16, fontWeight: "600" },
  error: { color: "#FF5A5F", fontSize: 14, textAlign: "center" },
});
