import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import "./admin.css";
import { Toaster } from "@/components/ui/toaster";
import { AdminAuthProvider } from "@/components/admin/providers/AdminAuthProvider";
import { AuthenticatedLayoutWrapper } from "@/components/admin/layout/AuthenticatedLayoutWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Bigg Buzz Admin Dashboard",
  description: "Professional administration panel for Bigg Buzz cannabis registration system",
  robots: "noindex, nofollow", // Prevent indexing of admin pages
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} font-sans admin-layout admin-theme bg-background text-foreground min-h-screen`}>
      <AdminAuthProvider>
        <AuthenticatedLayoutWrapper>{children}</AuthenticatedLayoutWrapper>
        {/* Toast Notifications always available */}
        <Toaster />
      </AdminAuthProvider>
    </div>
  );
}