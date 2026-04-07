import { Elysia, t } from "elysia";

function countLetters(word: string, letters: string) {
  const counts = new Map<string, number>();
  let total = 0;
  const wordLower = word.toLowerCase();

  const lettersSet = new Set(letters.toLowerCase());
  for (const char of wordLower) {
    if (lettersSet.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
      total++;
    }
  }

  const breakdown = [...counts.entries()].map(([l, c]) => `'${l}': ${c}`).join(", ");
  return `Word: "${word}"\nLetters: "${letters}"\n\nResults: ${breakdown}\nTotal: ${total}`;
}

export const countLetterRoute = new Elysia().post(
  "/aikit/count-letters",
  ({ body: { word, letters } }) => countLetters(word, letters),
  {
    body: t.Object({
      word: t.String({ description: "The word to analyze" }),
      letters: t.String({ description: "The letters to count (e.g., 'aeiou' for vowels)" }),
    }),
    detail: {
      summary: "Counts occurrences of specific letters in a given word",
    },
  },
);
