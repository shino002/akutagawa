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
  title: "자캐 보관소",
  description: "자캐별 사진, 설정, 연성, 기록을 정리하는 개인 홈",
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
