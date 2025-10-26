import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuyPilot - 타오바오 소싱 자동화',
  description: '타오바오 소싱의 모든 과정을 자동화하는 스마트한 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
