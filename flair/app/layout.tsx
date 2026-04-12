import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
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
  title: "FLAIR — Fair Lending AI Radar",
  description:
    "Turn federal mortgage data into fair lending evidence — in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col text-[#111]">
        <NavBar />
        <div className="flex-1">{children}</div>
        <footer className="py-8 text-center text-[11px] tracking-wide text-neutral-400 print:hidden">
          CFPB HMDA Data Browser &middot; U.S. Census ACS &middot; Stanford CodeX LLM x Law Hackathon
        </footer>
      </body>
    </html>
  );
}
