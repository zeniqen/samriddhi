// English reply → farmer's language, with the number guard in front of it.
import { checkReply, extractNumbers, maskNumbers, unmaskNumbers } from "./factcheck";
import { normaliseNumbers } from "./number-words";
import { t, type TemplateKey } from "./templates";
import type { Lang } from "./types";

export async function localize(
  input: {
    replyEnglish: string;
    lang: Lang;
    /** null = plain question, skip the number check */
    allowed: number[] | null;
    fallback: { key: TemplateKey; vars?: Record<string, string | number> };
    /** Proper names to protect from translation, English → native spelling (e.g. Dakha → दाखा). */
    names?: Record<string, string>;
  },
  deps: { translate: (text: string, lang: Lang) => Promise<string> },
): Promise<{ text: string; usedTemplate: boolean }> {
  const template = () => ({ text: t(input.fallback.key, input.lang, input.fallback.vars), usedTemplate: true });

  if (!input.replyEnglish.trim()) return template();
  if (input.allowed && !checkReply(input.replyEnglish, input.allowed)) return template();

  // Spelled-out numbers become digits first, so they are masked like any other number.
  const { masked: numbersMasked, values } = maskNumbers(normaliseNumbers(input.replyEnglish));
  // Names get placeholders too: the translator turned "Dakha" into ढाका (Dhaka).
  const names = Object.entries(input.names ?? {}).filter(([en]) => numbersMasked.includes(en));
  const masked = names.reduce((txt, [en], i) => txt.split(en).join(`{{P${i + 1}}}`), numbersMasked);
  try {
    const translated = await deps.translate(masked, input.lang);
    const withNames = names.reduce(
      (txt, [, native], i) => txt.replace(new RegExp(`\\{\\{\\s*P${i + 1}\\s*\\}\\}`, "g"), native),
      translated,
    );
    const text = unmaskNumbers(withNames, values);
    // A placeholder the translator dropped or mangled means the numbers are no longer trustworthy.
    if (/\{\{|\}\}/.test(text) || (values.length > 0 && !values.every((v) => text.includes(v)))) return template();
    // …and the translator must not have added a number of its own.
    const sent = values.map((v) => Number(v.replace(/,/g, "")));
    if (!extractNumbers(text).every((n) => sent.includes(n))) return template();
    return { text: neutralAddress(text), usedTemplate: false };
  } catch {
    return template();
  }
}

/**
 * English "you" has no gender, so the translator guesses and often picks feminine (चाहेंगी).
 * Farmers are addressed with the respectful plural, which fits anyone: चाहेंगे, ਚਾਹੋਗੇ.
 */
export function neutralAddress(text: string): string {
  return text.replace(/(\S)ेंगी(?=[\s।?!,.]|$)/g, "$1ेंगे").replace(/(\S)ੋਗੀ(?=[\s।?!,.]|$)/g, "$1ੋਗੇ");
}
