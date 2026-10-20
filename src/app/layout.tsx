import type { Metadata } from "next";
import { Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { AppShell } from "@/components/shared/app-shell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const notoSansSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  variable: "--font-sinhala"
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  variable: "--font-tamil"
});

export const metadata: Metadata = {
  title: "UniCare Connect",
  description: "Holistic support system for Sri Lankan university students"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${notoSansSinhala.variable} ${notoSansTamil.variable}`}>
      <body className="min-h-screen bg-black font-sans text-slate-100">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
