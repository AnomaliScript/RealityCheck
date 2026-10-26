import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthContext";
import { leaveHangout } from "@/features/hangouts/hangouts";
import { useHangout, type Member } from "@/features/hangouts/useHangout";

import { fakeEngine } from "@/proximity/fakeEngine";
import type { SessionPhase } from "@/proximity/types";
import { useProximity } from "@/proximity/useProximity";

import { issueChallenge } from "@/features/challenges/challenges";
import { useChallengeTimer } from "@/features/challenges/useChallengeTimer";

const PHRASE_ON = "ACTIVE ";
const PHRASE_OFF = "STANDBY ";

export default function Connect() {
  const router = useRouter();
  const { user } = useAuth();
  const { hangout, loading } = useHangout();
  const { phase, present, cooldownLeftMs, gpsStatus } = useProximity(
    hangout?.id ?? null,
    user?.uid ?? null,
  );
  useChallengeTimer(hangout, phase);
  const [simFriends, setSimFriends] = useState<Member[]>([]);

  // Everyone in the hangout except you, plus any dev-only simulated friends.
  const others = hangout
    ? hangout.members.filter((m) => m.id !== user?.uid)
    : [];
  const people = [...others, ...simFriends];

  // The cooldown ran out and nobody came back: you've left the radius, so you
  // leave the hangout. This is the cooldown from your original design.
  const prevPhase = useRef(phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (hangout && user && was === "cooldown" && phase === "idle") {
      leaveHangout(hangout.id, user.uid).catch((e) => console.warn(e));
    }
  }, [phase, hangout, user]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect</Text>
          <Pressable
            hitSlop={12}
            onPress={() => router.push("/settings")}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsLabel}>Settings</Text>
          </Pressable>
        </View>

        <StatusStrip
          inHangout={!!hangout}
          phase={phase}
          count={present.length}
          cooldownLeftMs={cooldownLeftMs}
        />
        {hangout && gpsStatus === "denied" ? (
          <Text style={styles.devHint}>
            Location is off, so RealityCheck can’t tell when friends are near.
            Turn it on in iOS Settings → Expo Go → Location.
          </Text>
        ) : null}

        <Text style={styles.sectionLabel}>
          {hangout ? "In this hangout" : "Your people"}
        </Text>

        <View style={styles.card}>
          {people.length === 0 ? (
            <Text style={styles.emptyRow}>
              {loading
                ? "Loading…"
                : hangout
                  ? `Nobody else yet. Share code ${hangout.code} to invite friends.`
                  : "Not in a hangout. Start one, or join a friend’s with their code."}
            </Text>
          ) : (
            people.map((person, i) => {
              const nearby = present.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  onPress={() => {
                    if (__DEV__) {
                      fakeEngine.setPresent(
                        person.id,
                        !fakeEngine.isPresent(person.id),
                      );
                    }
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[styles.dot, nearby ? styles.dotOn : styles.dotOff]}
                  />
                  <Text style={styles.rowName}>{person.name}</Text>
                  <PresenceLabel nearby={nearby} />
                </Pressable>
              );
            })
          )}
        </View>

        {__DEV__ && people.length > 0 && (
          <Text style={styles.devHint}>
            Dev mode: tap someone to simulate them arriving or leaving.
          </Text>
        )}

        {__DEV__ && (
          <Pressable
            style={styles.devButton}
            onPress={() => {
              const n = simFriends.length + 1;
              setSimFriends([
                ...simFriends,
                { id: `sim-${n}`, name: `Test friend ${n}` },
              ]);
            }}
          >
            <Text style={styles.devButtonLabel}>
              + Add a simulated friend (dev only)
            </Text>
          </Pressable>
        )}

        {hangout ? (
          <Pressable
            style={styles.pairButton}
            onPress={() => {
              issueChallenge(hangout.id).catch((e) => console.warn(e));
            }}
          >
            <Text style={styles.pairLabel}>Pull a challenge</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.pairButton}
          onPress={() => router.push("/hangout")}
        >
          <Text style={styles.pairLabel}>
            {hangout
              ? `Hangout code · ${hangout.code}`
              : "Start or join or leave a hangout"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
 * Infinitely side-scrolling text, news-ticker style.
 * `speed` is pixels per second, so higher is faster. The duration is derived
 * from the measured width so the speed stays constant no matter how long
 * the phrase is.
 */

const MARQUEE_SIZE = 64;

const WINDOW_OVERHANG_X = 60;
const WINDOW_OVERHANG_Y = 30;

function Marquee({
  text,
  textStyle,
  speed = 45,
}: {
  text: string;
  textStyle: object;
  speed?: number;
}) {
  const [windowW, setWindowW] = useState(0);
  const [itemW, setItemW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  // One phrase of lead on the left, enough to fill the window,
  // one more that slides in during each pass, plus a spare.
  const copies = itemW > 0 && windowW > 0 ? Math.ceil(windowW / itemW) + 6 : 6;

  useEffect(() => {
    if (itemW === 0) return;

    // Troubleshooting
    console.log("marquee: start", itemW);

    x.setValue(0);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -itemW,
        duration: (itemW / speed) * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    anim.start();

    return () => {
      // Troubleshooting
      console.log("marquee: cleanup");
      anim.stop();
    };
  }, [itemW, speed, x]);

  return (
    <View
      style={styles.marqueeClip}
      pointerEvents="none"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setWindowW((prev) => (prev === 0 ? w : prev));
      }}
    >
      <Animated.View
        style={[
          styles.marqueeTrack,
          {
            // Start one phrase to the left so the left edge is never bare.
            left: itemW > 0 ? -itemW : 0,
            transform: [{ translateX: x }],
          },
        ]}
      >
        {Array.from({ length: copies }).map((_, i) => (
          <Text
            key={i}
            style={[textStyle, styles.marqueeText]}
            allowFontScaling={false}
            onLayout={
              i === 0
                ? (e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) setItemW((prev) => (prev === 0 ? w : prev));
                  }
                : undefined
            }
          >
            {text}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const STATUS_LINE = 20; // one line of the status text, in px

/** "Away" / "Nearby" with a vertical back-in / back-out flip between them. */
function PresenceLabel({ nearby }: { nearby: boolean }) {
  // Start at the correct word so nothing animates on first render.
  const y = useRef(new Animated.Value(nearby ? -STATUS_LINE : 0)).current;

  useEffect(() => {
    Animated.timing(y, {
      toValue: nearby ? -STATUS_LINE : 0,
      duration: 420,
      easing: Easing.inOut(Easing.back(1.6)),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [nearby, y]);

  return (
    <View
      style={styles.flipClip}
      accessible
      accessibilityLabel={nearby ? "Nearby" : "Away"}
    >
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <Text style={[styles.rowState, styles.flipWord]}>Away</Text>
        <Text style={[styles.rowState, styles.flipWord, styles.flipNearby]}>
          Nearby
        </Text>
      </Animated.View>
    </View>
  );
}

function stripCopy(
  inHangout: boolean,
  phase: SessionPhase,
  count: number,
  secondsLeft: number,
) {
  if (!inHangout) {
    return {
      title: "No hangout",
      body: "Start one or join a friend’s code. RealityCheck does nothing until then.",
    };
  }

  const friends = `${count} ${count === 1 ? "friend" : "friends"}`;
  switch (phase) {
    case "idle":
      return {
        title: "Waiting for your people",
        body: "Nobody in this hangout is in range yet.",
      };
    case "forming":
      return {
        title: "Friends nearby",
        body: `${friends} in range. The hangout goes live if you stick around.`,
      };
    case "active":
      return {
        title: "Hangout in progress",
        body: `${friends} in range. RealityCheck stays quiet until it has a reason not to.`,
      };
    case "cooldown":
      return {
        title: "Wrapping up",
        body: `You’re out of range of everyone. You’ll leave the hangout in ${secondsLeft}s unless someone comes back.`,
      };
  }
}

function StatusStrip({
  inHangout,
  phase,
  count,
  cooldownLeftMs,
}: {
  inHangout: boolean;
  phase: SessionPhase;
  count: number;
  cooldownLeftMs: number;
}) {
  const live = inHangout && (phase === "active" || phase === "cooldown");
  const { title, body } = stripCopy(
    inHangout,
    phase,
    count,
    Math.ceil(cooldownLeftMs / 1000),
  );

  return (
    <View style={[styles.strip, live ? styles.stripOn : styles.stripOff]}>
      <Marquee
        key={live ? "on" : "off"}
        text={live ? PHRASE_ON : PHRASE_OFF}
        textStyle={live ? styles.marqueeOn : styles.marqueeOff}
      />

      <View style={styles.stripContent}>
        <Text style={styles.stripTitle}>{title}</Text>
        <Text style={styles.stripBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F" },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  settingsButton: { paddingVertical: 4 },
  settingsLabel: { color: "#6E6E7A", fontSize: 15, fontWeight: "500" },

  strip: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  stripOn: { backgroundColor: "#12251A", borderColor: "#1F4A32" },
  stripOff: { backgroundColor: "#15151C", borderColor: "#23232D" },

  marqueeClip: {
    position: "absolute",
    left: -WINDOW_OVERHANG_X,
    right: -WINDOW_OVERHANG_X,
    top: -WINDOW_OVERHANG_Y,
    bottom: -WINDOW_OVERHANG_Y,
    justifyContent: "center",
    transform: [{ translateX: -500 }, { rotate: "-3deg" }],
  },
  marqueeTrack: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 10000, // never constrain the text, so it never wraps
    flexDirection: "row",
    alignItems: "center",
  },
  marqueeText: {
    flexShrink: 0,
    fontFamily: "BebasNeue_400Regular",
    fontSize: MARQUEE_SIZE,
    lineHeight: MARQUEE_SIZE,
    letterSpacing: 2,
  },
  marqueeOn: { color: "#1C3A28" },
  marqueeOff: { color: "#1E1E28" },

  stripContent: { gap: 4 },
  stripTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  stripBody: { color: "#8E8E9A", fontSize: 14, lineHeight: 20 },

  rowPressed: { backgroundColor: "#1B1B23" },
  devHint: { color: "#4A4A56", fontSize: 13, textAlign: "center" },

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
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#23232D" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: "#35C77B" },
  dotOff: { backgroundColor: "#3A3A46" },
  rowName: { color: "#fff", fontSize: 16, flex: 1 },
  rowState: { color: "#6E6E7A", fontSize: 14 },

  pairButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E3A",
    alignItems: "center",
    justifyContent: "center",
  },

  pairLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },

  flipClip: { height: STATUS_LINE, overflow: "hidden" },
  flipWord: {
    height: STATUS_LINE,
    lineHeight: STATUS_LINE,
    textAlign: "right",
  },
  flipNearby: { color: "#35C77B" },

  emptyRow: {
    color: "#6E6E7A",
    fontSize: 15,
    padding: 16,
    textAlign: "center",
  },

  // Dev-only
  devButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2E2E3A",
    alignItems: "center",
    justifyContent: "center",
  },

  devButtonLabel: { color: "#6E6E7A", fontSize: 14, fontWeight: "500" },
});
