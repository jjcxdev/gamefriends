import type React from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gameboy = localFont({
  src: "../public/fonts/GameBoy.ttf",
  display: "swap",
  variable: "--font-gameboy",
});

const pixeland = localFont({
  src: "../public/fonts/Pixeland.ttf",
  display: "swap",
  variable: "--font-pixeland",
});

const retrocomputer = localFont({
  src: "../public/fonts/Retrocomputer.ttf",
  display: "swap",
  variable: "--font-retrocomputer",
});

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Game Library",
  description:
    "Track your game collection and see what your friends are playing.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${gameboy.variable} ${pixeland.variable} ${retrocomputer.variable}`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
