import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    runTransaction,
    serverTimestamp,
    type Timestamp,
} from "firebase/firestore";

import { db } from "@/services/firebase";
import { pickChallenge, type ChallengeKind } from "./pool";

// Slightly longer than the 15s in the security rules, to absorb clock drift.
export const MIN_GAP_MS = 20 * 1000;

/**
 * Tries to issue a new challenge to the hangout. Several phones may try at
 * once; the transaction guarantees exactly one wins. Returns true if this
 * call issued it.
 */
export async function issueChallenge(hangoutId: string): Promise<boolean> {
  const ref = doc(db, "hangouts", hangoutId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return false;

    const data = snap.data();
    const last = data.challenge?.issuedAt as Timestamp | null | undefined;
    if (last && Date.now() - last.toMillis() < MIN_GAP_MS) return false;

    const def = pickChallenge(data.challenge?.defId ?? null);
    tx.update(ref, {
      challenge: {
        id: Math.random().toString(36).slice(2, 10),
        defId: def.id,
        kind: def.kind,
        prompt: def.prompt,
        issuedAt: serverTimestamp(),
      },
    });
    return true;
  });
}

export type PreparedPhoto = { uri: string; base64: string };

// Firestore documents max out at 1 MB; stay well under it.
const MAX_BASE64_CHARS = 850000;

/**
 * Shrinks and re-encodes a photo so it fits in a Firestore document.
 * Re-encoding also drops all metadata (EXIF), including any location data.
 */
export async function preparePhoto(uri: string): Promise<PreparedPhoto> {
  const attempts = [
    { width: 1080, compress: 0.6 },
    { width: 800, compress: 0.5 },
    { width: 640, compress: 0.4 },
  ];

  for (const { width, compress } of attempts) {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width, height: null });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (result.base64 && result.base64.length <= MAX_BASE64_CHARS) {
      return { uri: result.uri, base64: result.base64 };
    }
  }
  throw new Error("Photo is too large to save.");
}

export async function saveMemory(input: {
  hangoutId: string;
  challengeId: string;
  prompt: string;
  kind: ChallengeKind;
  author: { uid: string; displayName: string };
  audience: string[];
  text?: string;
  photo?: string;
}): Promise<void> {
  await addDoc(collection(db, "memories"), {
    hangoutId: input.hangoutId,
    challengeId: input.challengeId,
    prompt: input.prompt,
    kind: input.kind,
    authorUid: input.author.uid,
    authorName: input.author.displayName,
    audience: Array.from(new Set([...input.audience, input.author.uid])),
    text: input.text ?? null,
    photo: input.photo ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await deleteDoc(doc(db, "memories", memoryId));
}
