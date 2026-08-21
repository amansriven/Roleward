import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Roleward",
    template: "%s | Roleward",
  },
  description:
    "A contextualized AI career workspace connecting applications, coding practice, resume revisions, and interview preparation for your next internship or job.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
