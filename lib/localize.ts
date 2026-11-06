// English reply → farmer's language, with the number guard in front of it.
import { checkReply, maskNumbers, unmaskNumbers } from "./factcheck";
import { t, type TemplateKey } from "./templates";
import type { Lang } from "./types";

export async function localize(
  input: {
    replyEnglish: string;
    lang: Lang;
    /** null = plain question, skip the number check */
    allowed: number[] | null;
    fallback: { key: TemplateKey; vars?: Record<string, string | number> };
  },
  deps: { translate: (text: string, lang: Lang) => Promise<string> },
): Promise<{ text: string; usedTemplate: boolean }> {
  const template = () => ({ text: t(input.fallback.key, input.lang, input.fallback.vars), usedTemplate: true });

  if (!input.replyEnglish.trim()) return template();
  if (input.allowed && !checkReply(input.replyEnglish, input.allowed)) return template();

  const { masked, values } = maskNumbers(input.replyEnglish);
  try {
    const translated = await deps.translate(masked, input.lang);
    const text = unmaskNumbers(translated, values);
    // A placeholder the translator dropped or mangled means the numbers are no longer trustworthy.
    if (/\{\{|\}\}/.test(text) || (values.length > 0 && !values.every((v) => text.includes(v)))) return template();
    return { text, usedTemplate: false };
  } catch {
    return template();
  }
}
