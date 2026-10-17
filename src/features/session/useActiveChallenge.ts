/**
 * STUB. Returns the challenge the user should be looking at, or null.
 *
 * Real version subscribes to the active session doc and returns a challenge
 * when session.currentPrompt is set and this user hasn't responded. Keep the
 * object identity stable — the root layout keys its redirect on .id, so a new
 * object with the same id must not re-fire.
 *
 * To test the redirect now, return: { id: 'dev-challenge' }
 */

export type ActiveChallenge = {
  id: string;
};

export function useActiveChallenge(): ActiveChallenge | null {
  return null;
}
