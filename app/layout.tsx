import type { Metadata, Viewport } from "next";
import { Mukta, Noto_Sans_Gurmukhi, Tiro_Devanagari_Hindi, Tiro_Gurmukhi } from "next/font/google";
import "./globals.css";

// Body: Mukta (Devanagari + Latin) with Noto Sans Gurmukhi for Punjabi.
const mukta = Mukta({ variable: "--font-mukta", subsets: ["devanagari", "latin"], weight: ["400", "600", "700"] });
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "600", "700"] });
// Ledger voice: Tiro, a printed serif, for the slip, ledger and headings.
const tiro = Tiro_Devanagari_Hindi({ variable: "--font-tiro", subsets: ["devanagari", "latin"], weight: "400" });
const tiroPa = Tiro_Gurmukhi({ variable: "--font-tiro-pa", subsets: ["gurmukhi"], weight: "400" });

export const metadata: Metadata = {
  title: "Samriddhi",
  description: "Farmers list produce by voice in Hindi or Punjabi. City buyers see where every rupee goes.",
};

export const viewport: Viewport = { themeColor: "#fbf4d9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hi"
      className={`${mukta.variable} ${gurmukhi.variable} ${tiro.variable} ${tiroPa.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
