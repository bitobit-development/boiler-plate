import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "SubScribe to Bigg Buzz",
  description: "South Africa’s Premier Cannabis Collective – Setting the Standard for Quality, Innovation, and Growth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
        />
        <main className="flex-1">
          {children}
        </main>
        <footer className="mt-auto py-4 px-6 border-t border-zinc-800">
          <div className="container mx-auto text-center">
            <p className="text-sm text-zinc-500">
              © 2025 Bigg Buzz. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
