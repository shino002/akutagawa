import type { Metadata } from "next";
import { Geist, Geist_Mono, Shippori_Mincho, Yuji_Mai } from "next/font/google";
import { ClickSoundProvider } from "@/providers/ClickSoundProvider";
import { TextCorruptorProvider } from "@/providers/TextCorruptorProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const yujiMai = Yuji_Mai({
  variable: "--font-yuji-mai",
  subsets: ["latin"],
  weight: "400",
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${yujiMai.variable} ${shipporiMincho.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ClickSoundProvider>
          <TextCorruptorProvider>{children}</TextCorruptorProvider>
        </ClickSoundProvider>
      </body>
    </html>
  );
}
