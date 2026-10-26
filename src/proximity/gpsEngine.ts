import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    type Timestamp,
} from "firebase/firestore";

import { db } from "@/services/firebase";
import type { Sighting } from "./types";

const CELL_METERS = 60; // size of one grid square
const MAX_ACCURACY_M = 150; // ignore GPS fixes vaguer than this
const STALE_AFTER_MS = 30 * 60 * 1000; // a closed app's last square stays valid this long
const EMIT_EVERY_MS = 3000; // how often matches are fed to the state machine
const HEARTBEAT_MS = 60 * 1000; // re-upload even if you haven't moved

const METERS_PER_DEG_LAT = 111320;

export type GpsStatus = "off" | "on" | "denied" | "error";

/** Which grid square a position falls in. */
function cellOf(lat: number, lng: number) {
  const latStep = CELL_METERS / METERS_PER_DEG_LAT;
  // Longitude degrees shrink toward the poles, so size squares for this
  // latitude band to keep them roughly square. Everyone nearby shares a band.
  const band = Math.round(lat);
  const lngStep = latStep / Math.max(0.2, Math.cos((band * Math.PI) / 180));
  return { row: Math.floor(lat / latStep), col: Math.floor(lng / lngStep) };
}

/** Scrambles a square's ID. The hangout id acts as the salt. */
function hashCell(salt: string, row: number, col: number): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${row}:${col}`,
  );
}

/**
 * Proximity from location, without uploading coordinates. Returns a stop
 * function. Emits a sighting for every hangout member whose scrambled square
 * is your square or one of the 8 around it.
 */
export function startGpsEngine({
  hangoutId,
  uid,
  onSighting,
  onStatus,
}: {
  hangoutId: string;
  uid: string;
  onSighting: (s: Sighting) => void;
  onStatus?: (s: GpsStatus) => void;
}): () => void {
  let stopped = false;
  let neighborhood = new Set<string>();
  let myCell: string | null = null;
  let lastPublished = 0;
  let watch: Location.LocationSubscription | null = null;
  const friendCells = new Map<string, { cell: string; updatedAt: number }>();

  const presenceRef = doc(db, "hangouts", hangoutId, "presence", uid);

  async function onPosition(pos: Location.LocationObject) {
    if (stopped) return;
    if ((pos.coords.accuracy ?? Infinity) > MAX_ACCURACY_M) return;

    const { row, col } = cellOf(pos.coords.latitude, pos.coords.longitude);
    const offsets = [-1, 0, 1];
    const hashes = await Promise.all(
      offsets.flatMap((dr) =>
        offsets.map((dc) => hashCell(hangoutId, row + dr, col + dc)),
      ),
    );
    if (stopped) return;

    neighborhood = new Set(hashes);
    const own = hashes[4]; // the center square: offset (0, 0)

    if (own !== myCell || Date.now() - lastPublished > HEARTBEAT_MS) {
      myCell = own;
      lastPublished = Date.now();
      setDoc(presenceRef, { cell: own, updatedAt: serverTimestamp() }).catch(
        (e) => console.warn("presence publish", e),
      );
    }
  }

  // Everyone else's scrambled squares, live.
  const unsubscribe = onSnapshot(
    collection(db, "hangouts", hangoutId, "presence"),
    (snap) => {
      friendCells.clear();
      snap.docs.forEach((d) => {
        if (d.id === uid) return;
        const data = d.data({ serverTimestamps: "estimate" });
        friendCells.set(d.id, {
          cell: data.cell as string,
          updatedAt:
            (data.updatedAt as Timestamp | null)?.toMillis() ?? Date.now(),
        });
      });
    },
    (e) => console.warn("presence listener", e),
  );

  // Keep the state machine fed while matches hold.
  const emitTimer = setInterval(() => {
    if (neighborhood.size === 0) return;
    const now = Date.now();
    friendCells.forEach((f, peerId) => {
      if (now - f.updatedAt > STALE_AFTER_MS) return;
      if (neighborhood.has(f.cell)) {
        // GPS has no signal strength; report a constant "near" value.
        onSighting({ peerId, rssi: -60, at: now });
      }
    });
  }, EMIT_EVERY_MS);

  (async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (stopped) return;
    if (!perm.granted) {
      onStatus?.("denied");
      return;
    }
    onStatus?.("on");

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      },
      (pos) => {
        onPosition(pos);
      },
    );
    if (stopped) sub.remove();
    else watch = sub;
  })().catch((e) => {
    console.warn("gps engine", e);
    onStatus?.("error");
  });

  return () => {
    stopped = true;
    clearInterval(emitTimer);
    unsubscribe();
    watch?.remove();
  };
}
