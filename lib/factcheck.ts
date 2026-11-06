// Guards every number a farmer hears. The LLM may phrase things freely,
// but it may only mention numbers that exist in our stored facts.

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;

export function extractNumbers(text: string): number[] {
  return (text.match(NUMBER_RE) ?? []).map((s) => Number(s.replace(/,/g, "")));
}

/** The set of numbers a correct reply may contain: the facts plus the parts of the date. */
export function allowedNumbers(f: { quantityKg: number; pricePerKg: number; total?: number; pickupDate: string }): number[] {
  const [y, m, d] = f.pickupDate.split("-").map(Number);
  const out = [f.quantityKg, f.pricePerKg, y, m, d];
  if (f.total !== undefined) out.push(f.total);
  return out;
}

export function checkReply(replyEnglish: string, allowed: number[]): boolean {
  return extractNumbers(replyEnglish).every((n) => allowed.some((a) => Math.abs(a - n) < 1e-9));
}

/** A read-back or confirmation must actually state the key numbers, not just avoid wrong ones. */
export function mentionsAll(text: string, required: number[]): boolean {
  const found = extractNumbers(text);
  return required.every((r) => found.some((n) => Math.abs(n - r) < 1e-9));
}

/** Replace numbers with {{N1}}, {{N2}}… so a translator cannot alter them. */
export function maskNumbers(text: string): { masked: string; values: string[] } {
  const values: string[] = [];
  const masked = text.replace(NUMBER_RE, (m) => {
    values.push(m);
    return `{{N${values.length}}}`;
  });
  return { masked, values };
}

export function unmaskNumbers(masked: string, values: string[]): string {
  return masked.replace(/\{\{\s*N(\d+)\s*\}\}/g, (whole, i) => values[Number(i) - 1] ?? whole);
}
