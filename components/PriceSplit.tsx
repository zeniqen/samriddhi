import type { PriceSplit as Split } from "@/lib/types";

const LINES: { key: keyof Split; label: string; note: string }[] = [
  { key: "farmerPerKg", label: "Farmer", note: "the price they asked for" },
  { key: "partnerPerKg", label: "Pickup partner", note: "local aggregator: loading and transport" },
  { key: "bufferPerKg", label: "Spoilage buffer", note: "covers losses on the road" },
  { key: "platformPerKg", label: "Samriddhi fee", note: "6%" },
];

export const rupees = (n: number) => `₹${n.toFixed(2)}`;

/** One ledger entry per kg: every line, then the total on a double rule. */
export function PriceSplit({ split }: { split: Split }) {
  return (
    <table className="w-full">
      <caption className="sr-only">Price per kg, by who receives it</caption>
      <tbody>
        {LINES.map((line) => (
          <tr key={line.key} className="border-b border-rule">
            <th scope="row" className="py-2.5 text-left font-normal">
              <span className={`block font-semibold ${line.key === "farmerPerKg" ? "text-field" : "text-ink"}`}>
                {line.label}
              </span>
              <span className="block text-sm text-ink-soft">{line.note}</span>
            </th>
            <td
              className={`py-2.5 text-right align-top text-lg tabular-nums ${line.key === "farmerPerKg" ? "font-bold text-field" : ""}`}
            >
              {rupees(split[line.key])}
            </td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="pt-3 text-left font-ledger text-xl font-normal text-bahi">
            You pay per kg
          </th>
          <td className="pt-3 text-right">
            <span className="double-rule inline-block pb-0.5 font-ledger text-2xl tabular-nums text-ink">
              {rupees(split.buyerPerKg)}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
