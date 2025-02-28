import type React from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gameboy = localFont({
  src: "../public/fonts/Gameboy.ttf",
  variable: "--font-gameboy",
});

const pixeland = localFont({
  src: "../public/fonts/Pixeland.ttf",
  variable: "--font-pixeland",
});

const retrocomputer = localFont({
  src: "../public/fonts/Retrocomputer.ttf",
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
        className={`${retrocomputer.variable} ${gameboy.variable} ${pixeland.variable}`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
