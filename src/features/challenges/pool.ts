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
    prompt: "Get everyone in one photo without anyone looking at a screen.",
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
      "Find something the exact color of someone's shirt. Get both in the shot.",
  },
  {
    id: "p-first",
    kind: "photo",
    prompt: "Photograph someone doing something they have never done before.",
  },
  {
    id: "p-pose",
    kind: "photo",
    prompt: "Everyone strikes the same ridiculous pose. One photo.",
  },
  {
    id: "t-best",
    kind: "text",
    prompt: "What's the best thing that's happened since you all got here?",
  },
  {
    id: "t-quote",
    kind: "text",
    prompt:
      "Write down the funniest thing someone's said in the last ten minutes, word for word.",
  },
  {
    id: "t-predict",
    kind: "text",
    prompt: "Predict where this group will be in five years. One sentence.",
  },
  {
    id: "t-next",
    kind: "text",
    prompt:
      "Decide what you're all doing next. Write it down so nobody backs out.",
  },
];

/* A random challenge, avoiding an immediate repeat of the last one. */
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
