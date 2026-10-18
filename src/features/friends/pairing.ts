import {
    Timestamp,
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "@/services/firebase";

export const CODE_LENGTH = 6;
export const INVITE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const QR_PREFIX = "realitycheck:pair:";

// No 0/O or 1/I/L, so codes survive being read aloud or squinted at.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export class PairingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PairingError";
  }
}

function isPairingError(e: unknown): e is PairingError {
  return e instanceof Error && e.name === "PairingError";
}

/** Turns any error into something safe to show the user. */
export function pairingMessage(e: unknown): string {
  if (isPairingError(e)) return e.message;
  console.warn(e);
  return "Couldn't pair. Check your connection and try again.";
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

/** Same id no matter who redeems, so a pair can never be duplicated. */
export function friendshipId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export type Invite = { code: string; expiresAt: number };

export async function createInvite(me: {
  uid: string;
  displayName: string;
}): Promise<Invite> {
  // Collisions are about 1 in a billion, but retry anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = doc(db, "invites", code);
    const expiresAt = Date.now() + INVITE_TTL_MS;

    try {
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) throw new PairingError("collision");
        tx.set(ref, {
          code,
          fromUid: me.uid,
          fromName: me.displayName,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromMillis(expiresAt),
          usedBy: null,
        });
      });
      return { code, expiresAt };
    } catch (e) {
      if (isPairingError(e) && e.message === "collision") continue;
      throw e;
    }
  }
  throw new PairingError("Couldn't create a code. Try again.");
}

export async function redeemInvite(
  input: string,
  me: { uid: string },
): Promise<{ friendName: string }> {
  const code = normalizeCode(input);
  if (code.length !== CODE_LENGTH) {
    throw new PairingError(`Codes are ${CODE_LENGTH} characters.`);
  }

  const inviteRef = doc(db, "invites", code);

  // A transaction makes "mark invite used" and "create friendship" happen
  // together or not at all. The security rules depend on that.
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(inviteRef);
    if (!snap.exists()) throw new PairingError("That code doesn't exist.");

    const invite = snap.data();
    if (invite.fromUid === me.uid)
      throw new PairingError("That's your own code.");
    if (invite.usedBy)
      throw new PairingError("That code has already been used.");
    if ((invite.expiresAt as Timestamp).toMillis() < Date.now()) {
      throw new PairingError("That code has expired. Ask for a new one.");
    }

    const friendRef = doc(
      db,
      "friendships",
      friendshipId(me.uid, invite.fromUid),
    );
    const existing = await tx.get(friendRef);
    if (existing.exists()) {
      throw new PairingError(`You're already paired with ${invite.fromName}.`);
    }

    tx.update(inviteRef, { usedBy: me.uid });
    tx.set(friendRef, {
      members: [me.uid, invite.fromUid].sort(),
      inviteCode: code,
      createdAt: serverTimestamp(),
    });

    return { friendName: invite.fromName as string };
  });
}

/** Lets the person showing the code know the moment someone redeems it. */
export function watchInvite(
  code: string,
  onRedeemed: (friendName: string) => void,
): () => void {
  return onSnapshot(doc(db, "invites", code), async (snap) => {
    const usedBy = snap.data()?.usedBy as string | null | undefined;
    if (!usedBy) return;
    const profile = await getDoc(doc(db, "users", usedBy));
    onRedeemed(
      (profile.data()?.displayName as string | undefined) ?? "A friend",
    );
  });
}
