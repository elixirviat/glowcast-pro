import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AI_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: AI_NAME, // This automatically uses "GlowCast Pro" from your config file
  description: "Your personalized travel beauty advisor.",
  icons: {
    // CHANGE THIS LINK to your own image link if you want!
    icon: 'https://ibb.co/zhwfFCVq', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-background min-h-screen font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
