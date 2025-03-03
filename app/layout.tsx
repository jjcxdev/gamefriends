import type React from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const gameboyFont = localFont({
  src: "../public/fonts/GameBoy.ttf",
  variable: "--font-gameboy", // Optional: for CSS variable usage
});

const retrocomputerFont = localFont({
  src: "../public/fonts/RetroComputer.ttf",
  variable: "--font-retrocomputer", // Optional
});

const pixeland = localFont({
  src: "../public/fonts/Pixeland.ttf",
  variable: "--font-pixeland", // Optional
});

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "GameFriends",
  description: "See what your friends are playing.",
  openGraph: {
    type: "website",
    url: "https://games.jjcx.dev",
    title: "GameFriends",
    description: "See what your friends are playing.",
    images: [
      {
        url: "/images/opengraph-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameFriends",
    description: "See what your friends are playing.",
    images: ["/images/twitter-image.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${retrocomputerFont.variable} ${gameboyFont.variable} ${pixeland.variable}`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
