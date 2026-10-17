import type { PeerId, Sighting } from "./types";

const SIGHTING_INTERVAL_MS = 1500;
const DROP_RATE = 0.25; // simulate missed scans

export function createFakeEngine() {
  const present = new Set<PeerId>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let listener: ((s: Sighting) => void) | null = null;

  function emit() {
    if (!listener) return;
    const now = Date.now();
    present.forEach((peerId) => {
      if (Math.random() < DROP_RATE) return;
      listener?.({
        peerId,
        rssi: -55 - Math.round(Math.random() * 15), // -55 to -70: nearby
        at: now,
      });
    });
  }

  return {
    start(onSighting: (s: Sighting) => void) {
      listener = onSighting;
      if (!timer) timer = setInterval(emit, SIGHTING_INTERVAL_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      listener = null;
    },
    setPresent(peerId: PeerId, isPresent: boolean) {
      if (isPresent) present.add(peerId);
      else present.delete(peerId);
    },
    isPresent(peerId: PeerId) {
      return present.has(peerId);
    },
  };
}

export const fakeEngine = createFakeEngine();
