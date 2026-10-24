import {
  Timestamp,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/services/firebase";

export const CODE_LENGTH = 6;
export const HANGOUT_MAX_MS = 6 * 60 * 60 * 1000; // 6 hours
export const QR_PREFIX = "realitycheck:join:";

// No 0/O or 1/I/L, so codes survive being read aloud or squinted at.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type Me = { uid: string; displayName: string };

export class HangoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HangoutError";
  }
}

function isHangoutError(e: unknown): e is HangoutError {
  return e instanceof Error && e.name === "HangoutError";
}

/** Turns any error into something safe to show the user. */
export function hangoutMessage(e: unknown): string {
  if (isHangoutError(e)) return e.message;
  console.warn(e);
  return "Something went wrong. Check your connection and try again.";
}

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Accepts "abc 123", "ABC123", or a scanned QR payload. */
export function normalizeCode(input: string): string {
  const raw = input.startsWith(QR_PREFIX)
    ? input.slice(QR_PREFIX.length)
    : input;
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Creates a hangout with you as host and only member. Returns its id. */
export async function startHangout(me: Me): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const codeRef = doc(db, "hangoutCodes", code);
    const hangoutRef = doc(collection(db, "hangouts")); // new random id

    try {
      await runTransaction(db, async (tx) => {
        const taken = await tx.get(codeRef);
        if (taken.exists()) throw new HangoutError("collision");

        tx.set(hangoutRef, {
          code,
          hostUid: me.uid,
          members: [me.uid],
          memberNames: { [me.uid]: me.displayName },
          status: "active",
          createdAt: serverTimestamp(),
          endsAt: Timestamp.fromMillis(Date.now() + HANGOUT_MAX_MS),
        });
        tx.set(codeRef, {
          hangoutId: hangoutRef.id,
          hostUid: me.uid,
          createdAt: serverTimestamp(),
        });
      });
      return hangoutRef.id;
    } catch (e) {
      if (isHangoutError(e) && e.message === "collision") continue;
      throw e;
    }
  }
  throw new HangoutError("Couldn't start a hangout. Try again.");
}

/** Adds you to the hangout behind a code. Returns its id. */
export async function joinHangout(input: string, me: Me): Promise<string> {
  const code = normalizeCode(input);
  if (code.length !== CODE_LENGTH) {
    throw new HangoutError(`Codes are ${CODE_LENGTH} characters.`);
  }

  return runTransaction(db, async (tx) => {
    const codeSnap = await tx.get(doc(db, "hangoutCodes", code));
    if (!codeSnap.exists()) throw new HangoutError("That code doesn't exist.");

    const hangoutId = codeSnap.data().hangoutId as string;
    const hangoutRef = doc(db, "hangouts", hangoutId);
    const snap = await tx.get(hangoutRef);
    if (!snap.exists())
      throw new HangoutError("That hangout doesn't exist anymore.");

    const data = snap.data();
    const ended =
      data.status !== "active" ||
      (data.endsAt as Timestamp).toMillis() < Date.now();
    if (ended) throw new HangoutError("That hangout has already ended.");

    const members = data.members as string[];
    if (members.includes(me.uid)) return hangoutId; // already in

    tx.update(hangoutRef, {
      members: [...members, me.uid],
      [`memberNames.${me.uid}`]: me.displayName,
    });
    return hangoutId;
  });
}

export async function leaveHangout(
  hangoutId: string,
  uid: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "hangouts", hangoutId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const members = snap.data().members as string[];
    if (!members.includes(uid)) return;

    tx.update(ref, { members: members.filter((m) => m !== uid) });
  });
}

/** Host only: ends the hangout for everyone. */
export async function endHangout(hangoutId: string): Promise<void> {
  await updateDoc(doc(db, "hangouts", hangoutId), { status: "ended" });
}
