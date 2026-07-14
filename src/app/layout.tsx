import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRANDING } from "@/lib/branding";
import { getWorkspaceSettings } from "@/lib/server/settings";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWorkspaceSettings();
  return {
    title: `${BRANDING.product} — ${settings.workspaceName}`,
    description:
      "Agency operations console — clients, leads, trials, billing, support, and AI health across every tenant.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="h-full bg-bg text-fg font-sans text-[13px] antialiased">
        {children}
      </body>
    </html>
  );
}
