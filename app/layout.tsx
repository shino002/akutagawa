import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClickSound from "./components/ClickSound";
import TextCorruptor from "./components/TextCorruptor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "芥川",
  description: "자̷캐̸ 보̶관̴소̷ ― 사̵진̸, 설̶정̷, 연̸성̴, 기̶록̷의 파̴편̵들̸",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClickSound />
        <TextCorruptor />
        {children}
      </body>
    </html>
  );
}
