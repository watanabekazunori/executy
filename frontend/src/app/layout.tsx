import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthProvider from '@/components/providers/AuthProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'EXECUTY - AI Executive Task Management',
  description: '経営者・マネージャーのための全自動AIタスク管理システム',
  keywords: ['タスク管理', 'AI', '経営者', 'マネージャー', 'プロジェクト管理'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased scrollbar-thin" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
