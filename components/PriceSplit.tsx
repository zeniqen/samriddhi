import type { PriceSplit as Split } from "@/lib/types";

const ROWS: { key: keyof Split; label: string; note: string; tone: string }[] = [
  { key: "farmerPerKg", label: "Farmer", note: "set by the farmer", tone: "bg-leaf" },
  { key: "partnerPerKg", label: "Pickup partner", note: "local aggregator: transport + loading", tone: "bg-turmeric" },
  { key: "bufferPerKg", label: "Spoilage buffer", note: "covers losses in transit", tone: "bg-muted" },
  { key: "platformPerKg", label: "Platform fee", note: "6%", tone: "bg-tomato" },
];

const rupees = (n: number) => `₹${n % 1 === 0 ? n : n.toFixed(2)}`;

export function PriceSplit({ split }: { split: Split }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
        {ROWS.map((r) => (
          <div key={r.key} className={r.tone} style={{ width: `${(split[r.key] / split.buyerPerKg) * 100}%` }} />
        ))}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key} className="border-b border-line">
              <td className="py-2">
                <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${r.tone}`} aria-hidden />
                <span className="font-semibold">{r.label}</span>
                <span className="ml-2 text-muted">{r.note}</span>
              </td>
              <td className="py-2 text-right tabular-nums">{rupees(split[r.key])}/kg</td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 font-extrabold">You pay</td>
            <td className="pt-2 text-right text-lg font-extrabold tabular-nums">{rupees(split.buyerPerKg)}/kg</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-muted">All figures are illustrative assumptions for this prototype.</p>
    </div>
  );
}
