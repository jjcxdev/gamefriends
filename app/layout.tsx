import type React from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gameboyFont = localFont({
  src: "../public/fonts/GameBoy.ttf",
  variable: "--font-gameboy", // Optional: for CSS variable usage
});

const retrocomputerFont = localFont({
  src: "../public/fonts/RetroComputer.ttf",
  variable: "--font-retrocomputer", // Optional
});

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "GameFriends",
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
        className={`${retrocomputerFont.variable} ${gameboyFont.variable} `}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
