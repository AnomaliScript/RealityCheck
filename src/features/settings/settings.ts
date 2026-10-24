import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import type { ChallengeDef, ChallengeKind } from "@/features/challenges/pool";

export const INTERVAL_OPTIONS = [1, 5, 10, 20, 30, 60]; // minutes
export const DEFAULT_INTERVAL_MIN = 20;
export const MAX_PROMPT_LENGTH = 200; // matches the security rules

const STORAGE_KEY = "realitycheck:settings:v1";

export type Settings = {
  challengeIntervalMin: number;
  customChallenges: ChallengeDef[];
};

let state: Settings = {
  challengeIntervalMin: DEFAULT_INTERVAL_MIN,
  customChallenges: [],
};
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function update(next: Settings) {
  state = next;
  changedBeforeLoad = true;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
    console.warn("settings save failed", e),
  );
}

// Load saved settings once, when the app starts.
AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw || changedBeforeLoad) return;
    const saved = JSON.parse(raw) as Partial<Settings>;
    state = {
      challengeIntervalMin:
        typeof saved.challengeIntervalMin === "number"
          ? saved.challengeIntervalMin
          : DEFAULT_INTERVAL_MIN,
      customChallenges: Array.isArray(saved.customChallenges)
        ? saved.customChallenges
        : [],
    };
    emit();
  })
  .catch((e) => console.warn("settings load failed", e));

export function getSettings(): Settings {
  return state;
}

export function setChallengeInterval(minutes: number) {
  update({ ...state, challengeIntervalMin: minutes });
}

export function addCustomChallenge(kind: ChallengeKind, prompt: string) {
  const trimmed = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  if (!trimmed) return;
  const challenge: ChallengeDef = {
    id: `custom-${Date.now().toString(36)}`,
    kind,
    prompt: trimmed,
  };
  update({
    ...state,
    customChallenges: [...state.customChallenges, challenge],
  });
}

export function removeCustomChallenge(id: string) {
  update({
    ...state,
    customChallenges: state.customChallenges.filter((c) => c.id !== id),
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the component whenever a setting changes. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
