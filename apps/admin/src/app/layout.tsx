import type { Metadata } from "next";
import { Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sinhala = Noto_Sans_Sinhala({ variable: "--font-sinhala", subsets: ["sinhala"], weight: ["400", "600"] });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "600"] });

// Every page must render per request so Next.js can stamp the CSP nonce from src/proxy.ts onto its scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SLAF Content Management", template: "%s · SLAF CMS" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sinhala.variable} ${tamil.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
