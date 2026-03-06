import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/toast";
import { KeyboardHints } from "@/components/ui/keyboard-hints";

export const metadata: Metadata = {
  title: "LawGo - 법무 관리 시스템",
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
        <div className="flex h-screen overflow-hidden">
          {/* 사이드바: lg 이상에서만 노출 */}
          <div className="hidden lg:flex">
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
              {children}
            </main>
          </div>
        </div>
        {/* 모바일 하단 네비게이션 */}
        <MobileNav />
        <Toaster />
        <KeyboardHints />
      </body>
    </html>
  );
}
