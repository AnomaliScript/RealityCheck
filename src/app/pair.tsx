import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
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
    createInvite,
    pairingMessage,
    redeemInvite,
    watchInvite,
    type Invite,
} from "@/features/friends/pairing";

type Mode = "show" | "enter";

export default function Pair() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("show");
  const [pairedWith, setPairedWith] = useState<string | null>(null);

  // After a success, show the confirmation briefly, then close.
  useEffect(() => {
    if (!pairedWith) return;
    const t = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(t);
  }, [pairedWith, router]);

  if (pairedWith) {
    return (
      <View style={styles.center}>
        <Text style={styles.successTitle}>Paired</Text>
        <Text style={styles.successBody}>
          You and {pairedWith} are connected.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.segment}>
        <SegmentButton
          label="My code"
          active={mode === "show"}
          onPress={() => setMode("show")}
        />
        <SegmentButton
          label="Enter code"
          active={mode === "enter"}
          onPress={() => setMode("enter")}
        />
      </View>

      {mode === "show" ? (
        <ShowCode onPaired={setPairedWith} />
      ) : (
        <EnterCode onPaired={setPairedWith} />
      )}
    </ScrollView>
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

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ShowCode({ onPaired }: { onPaired: (name: string) => void }) {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const makeInvite = useCallback(async () => {
    if (!user) return;
    setError(null);
    setInvite(null);
    try {
      setInvite(await createInvite(user));
    } catch (e) {
      setError(pairingMessage(e));
    }
  }, [user]);

  useEffect(() => {
    makeInvite();
  }, [makeInvite]);

  // Countdown tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Hear about it the moment a friend redeems this code.
  useEffect(() => {
    if (!invite) return;
    return watchInvite(invite.code, onPaired);
  }, [invite, onPaired]);

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.primary} onPress={makeInvite}>
          <Text style={styles.primaryLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!invite) {
    return (
      <View style={styles.panel}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil((invite.expiresAt - now) / 1000));
  const expired = secondsLeft === 0;

  return (
    <View style={styles.panel}>
      <View style={[styles.qrWrap, expired && styles.dimmed]}>
        <QRCode
          value={QR_PREFIX + invite.code}
          size={200}
          color="#0B0B0F"
          backgroundColor="#FFFFFF"
        />
      </View>

      <Text style={[styles.code, expired && styles.dimmed]}>
        {invite.code.slice(0, 3)} {invite.code.slice(3)}
      </Text>

      {expired ? (
        <Pressable style={styles.primary} onPress={makeInvite}>
          <Text style={styles.primaryLabel}>New code</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>
          Have your friend scan this, or type the code. Expires in{" "}
          {formatTime(secondsLeft)}.
        </Text>
      )}
    </View>
  );
}

function EnterCode({ onPaired }: { onPaired: (name: string) => void }) {
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
      const { friendName } = await redeemInvite(input, user);
      onPaired(friendName);
    } catch (e) {
      setError(pairingMessage(e));
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
          <Text style={styles.secondaryLabel}>Scan a friend's QR code</Text>
        </Pressable>
      )}

      <Text style={styles.or}>or type their code</Text>

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
          <Text style={styles.primaryLabel}>Pair</Text>
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
    padding: 32,
    gap: 8,
  },
  successTitle: { color: "#35C77B", fontSize: 28, fontWeight: "700" },
  successBody: { color: "#fff", fontSize: 17, textAlign: "center" },

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

  panel: { gap: 16, alignItems: "stretch" },

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
  error: { color: "#FF5A5F", fontSize: 14, textAlign: "center" },
});
