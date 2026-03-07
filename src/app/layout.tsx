import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { KeyboardHints } from "@/components/ui/keyboard-hints";
import { ThemeInit } from "@/components/ThemeInit";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const metadata: Metadata = {
  title: "LawyGo - 법무 관리 시스템",
  description: "법무법인을 위한 스마트 사건 관리 플랫폼",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚖️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-text-primary">
        <ThemeInit />
        <AuthLayout>{children}</AuthLayout>
        <Toaster />
        <KeyboardHints />
      </body>
    </html>
  );
}
