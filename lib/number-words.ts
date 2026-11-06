// Spelled-out English numbers → digits, and thousands separators removed.
// Shared by the fallback parser and the fact-check, so a number can't hide as a word.

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = { hundred: 100, thousand: 1000 };
const NUM_WORD = `(?:${[...Object.keys(ONES), ...Object.keys(SCALES)].join("|")})`;
const NUM_PHRASE = new RegExp(
  `\\b${NUM_WORD}(?:(?:\\s+and\\s+|\\s+|-)${NUM_WORD})*(?:\\s+and\\s+a\\s+half)?\\b`,
  "gi",
);

function phraseToNumber(phrase: string): number {
  let total = 0;
  let current = 0;
  const half = /and\s+a\s+half$/i.test(phrase);
  for (const w of phrase.toLowerCase().replace(/and\s+a\s+half$/, "").split(/[\s-]+/)) {
    if (w in ONES) current += ONES[w];
    else if (w === "hundred") current = (current || 1) * 100;
    else if (w === "thousand") {
      total += (current || 1) * 1000;
      current = 0;
    }
  }
  return total + current + (half ? 0.5 : 0);
}

export function wordsToDigits(text: string): string {
  return text.replace(NUM_PHRASE, (m) => String(phraseToNumber(m)));
}

/** "One hundred kilos at ₹1,600" → "100 kilos at ₹1600" */
export function normaliseNumbers(text: string): string {
  return wordsToDigits(text).replace(/(\d),(?=\d{2,3}\b)/g, "$1");
}
