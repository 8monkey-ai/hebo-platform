import { Elysia, t } from "elysia";

function countLetters(word: string, letters: string) {
  const requestedLetters = [...new Set(letters.toLowerCase())];
  const counts = new Map<string, number>(requestedLetters.map((l) => [l, 0]));
  let total = 0;
  const wordLower = word.toLowerCase();

  for (const char of wordLower) {
    if (counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
      total++;
    }
  }

  const breakdown = requestedLetters.map((l) => `'${l}': ${counts.get(l) ?? 0}`).join(", ");
  return `Word: "${word}"\nLetters: "${letters}"\n\nResults: ${breakdown}\nTotal: ${total}`;
}

export const countLetterRoute = new Elysia().post(
  "/count-letters",
  ({ body: { word, letters } }) => countLetters(word, letters),
  {
    body: t.Object({
      word: t.String({ description: "The word to analyze" }),
      letters: t.String({ description: "The letters to count (e.g., 'aeiou' for vowels)" }),
    }),
    detail: {
      operationId: "count_letters",
      summary: "Counts occurrences of specific letters in a given word",
    },
  },
);
