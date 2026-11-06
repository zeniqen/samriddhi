import type { Metadata, Viewport } from "next";
import { Mukta, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

const mukta = Mukta({ variable: "--font-mukta", subsets: ["devanagari", "latin"], weight: ["400", "600", "800"] });
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "600", "800"] });

export const metadata: Metadata = {
  title: "Kisan Awaaz",
  description: "Farmers list produce by voice in Hindi or Punjabi; city buyers order directly.",
};

export const viewport: Viewport = { themeColor: "#2f6b3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${mukta.variable} ${gurmukhi.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
