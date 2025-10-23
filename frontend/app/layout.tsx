import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuyPilot - 주문 관리 시스템',
  description: 'AI 기반 자동 구매 및 배대지 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-vscode-bg-primary text-vscode-text-primary antialiased">
        {/* 상단 바 */}
        <header className="h-10 bg-vscode-bg-secondary border-b border-vscode-border-primary flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-vscode-accent-red opacity-80" />
              <div className="w-3 h-3 rounded-full bg-vscode-accent-yellow opacity-80" />
              <div className="w-3 h-3 rounded-full bg-vscode-accent-green opacity-80" />
            </div>
            <h1 className="text-sm font-semibold text-vscode-text-primary ml-4">
              BuyPilot
            </h1>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="min-h-[calc(100vh-2.5rem)]">
          {children}
        </main>

        {/* 하단 상태 바 */}
        <footer className="h-6 bg-vscode-accent-blue text-white text-xs flex items-center px-4 gap-4">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12z"/>
              <circle cx="8" cy="8" r="3"/>
            </svg>
            <span>연결됨</span>
          </div>
          <div className="text-white/80">
            v1.0.0
          </div>
          <div className="ml-auto text-white/80">
            Railway + Supabase
          </div>
        </footer>
      </body>
    </html>
  )
}
