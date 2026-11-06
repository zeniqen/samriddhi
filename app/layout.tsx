import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Gurmukhi, Anek_Latin, Mukta, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

// Display: Anek, one modern Indian family across Latin, Devanagari and Gurmukhi, with a width axis
// used to set figures slightly condensed and headings slightly wide.
const anekLatin = Anek_Latin({ variable: "--font-anek-latin", subsets: ["latin"], weight: "variable", axes: ["wdth"] });
const anekDeva = Anek_Devanagari({ variable: "--font-anek-deva", subsets: ["devanagari"], weight: "variable", axes: ["wdth"] });
const anekGuru = Anek_Gurmukhi({ variable: "--font-anek-guru", subsets: ["gurmukhi"], weight: "variable", axes: ["wdth"] });
// Body: Mukta (Devanagari + Latin) with Noto Sans Gurmukhi for Punjabi, chosen for plain, readable letterforms.
const mukta = Mukta({ variable: "--font-mukta", subsets: ["devanagari", "latin"], weight: ["400", "500", "600", "700"] });
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Samriddhi",
  description: "Farmers list produce by voice in Hindi or Punjabi. City buyers see where every rupee goes.",
};

export const viewport: Viewport = { themeColor: "#f6f3e9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hi"
      className={`${anekLatin.variable} ${anekDeva.variable} ${anekGuru.variable} ${mukta.variable} ${gurmukhi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
