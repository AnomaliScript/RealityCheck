export type ChallengeKind = "photo" | "text";

export type ChallengeDef = {
  id: string;
  kind: ChallengeKind;
  prompt: string;
};

import { getSettings } from "@/features/settings/settings";

export const CHALLENGES: ChallengeDef[] = [
  {
    id: "p-group",
    kind: "photo",
    prompt:
      "Take a picture of a phone taking a photo of everyone in the group.",
  },
  {
    id: "p-shadow",
    kind: "photo",
    prompt: "Make one shape out of all your shadows and photograph it.",
  },
  {
    id: "p-stack",
    kind: "photo",
    prompt: "Build the tallest stack you can from what's around you.",
  },
  {
    id: "p-color",
    kind: "photo",
    prompt:
      "Find something the exact color of someone's shirt, and get both in the shot.",
  },
  {
    id: "p-first",
    kind: "photo",
    prompt: "Photograph someone doing something they have never done before.",
  },
  {
    id: "t-food",
    kind: "text",
    prompt: "What's one food you could really go for right now?",
  },
  {
    id: "t-funny",
    kind: "text",
    prompt:
      "Write down the funniest thing someone's said/done in the last ten minutes, exactly as you remember it.",
  },
  {
    id: "t-predict",
    kind: "text",
    prompt: "Predict where this group will be in five years in one sentence.",
  },
  {
    id: "p-stranger",
    kind: "photo",
    prompt: "High five a random stranger.",
  },
  {
    id: "t-plans",
    kind: "text",
    prompt: "What are you all planning to do after this?",
  },
  {
    id: "t-stress",
    kind: "text",
    prompt: "What are you all feeling stressed about right now?",
  },
];

// A random challenge, avoiding an immediate repeat of the last one.
export function pickChallenge(excludeId?: string | null): ChallengeDef {
  const notLast = (c: ChallengeDef) => c.id !== excludeId;
  const custom = getSettings().customChallenges.filter(notLast);
  const builtIn = CHALLENGES.filter(notLast);

  // Your own challenges come up about half the time, so they don't get
  // buried among the built-in ones.
  const useCustom =
    custom.length > 0 && (builtIn.length === 0 || Math.random() < 0.5);
  const source = useCustom ? custom : builtIn;

  return source[Math.floor(Math.random() * source.length)];
}
