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
          <tr key={line.key} className={`border-b border-rule ${line.key === "farmerPerKg" ? "bg-sage-soft" : ""}`}>
            <th scope="row" className="py-2.5 pl-2 text-left font-normal">
              <span className="block font-semibold text-forest">
                {line.label}
              </span>
              <span className="block text-sm text-soil-soft">{line.note}</span>
            </th>
            <td
              className={`py-2.5 pr-2 text-right align-top text-lg tabular-nums ${line.key === "farmerPerKg" ? "font-bold text-forest" : "text-soil"}`}
            >
              {rupees(split[line.key])}
            </td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="pt-3 text-left font-ledger text-xl font-normal text-forest">
            You pay per kg
          </th>
          <td className="pt-3 text-right">
            <span className="double-rule inline-block pb-0.5 font-ledger text-2xl tabular-nums text-forest">
              {rupees(split.buyerPerKg)}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
