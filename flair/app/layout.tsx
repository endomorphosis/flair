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
    "Look up any mortgage lender. See racial disparities in loan denials backed by federal HMDA data. Identify outliers. Connect to the legal framework.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-1">{children}</div>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 print:hidden">
          Data source: CFPB HMDA Data Browser | Built for LLM x Law Hackathon #6 at Stanford CodeX
        </footer>
      </body>
    </html>
  );
}
