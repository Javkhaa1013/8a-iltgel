import type { Metadata } from "next";
import { Lora, Nunito, Unbounded } from "next/font/google";
import "./globals.css";

// Монгол Ө, Ү үсэг "cyrillic-ext" хэсэгт байдаг тул заавал хамт ачаална
const nunito = Nunito({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-nunito" });
const lora = Lora({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-lora" });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "8А · Нийтлэл",
  description: "8А ангийн нийтлэл, эргэцүүлэл",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${nunito.variable} ${lora.variable} ${unbounded.variable}`}>
      <body>{children}</body>
    </html>
  );
}
