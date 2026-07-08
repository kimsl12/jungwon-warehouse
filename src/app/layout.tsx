import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "정원전기 재고관리",
  description: "사내 재고 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          {/* 전역 토스트 — 모바일 하단 탭바(~64px)와 겹치지 않게 offset */}
          <Toaster
            position="bottom-right"
            duration={3000}
            richColors
            mobileOffset={{ bottom: 76 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
