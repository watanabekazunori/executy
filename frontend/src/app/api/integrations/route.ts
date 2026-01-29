import { NextRequest, NextResponse } from 'next/server'

// 連携状態を保存（実際はDBに保存）
const integrationStatus: Record<string, boolean> = {
  googleCalendar: false,
  slack: false,
  gmail: false
}

export async function GET() {
  return NextResponse.json(integrationStatus)
}

export async function POST(request: NextRequest) {
  try {
    const { service, action } = await request.json()

    if (action === 'connect') {
      // OAuth認証URLを返す（実際の実装）
      const authUrls: Record<string, string> = {
        googleCalendar: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/integrations/callback/google')}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly`,
        gmail: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/integrations/callback/google')}&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly`,
        slack: `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=channels:read,chat:write&redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/integrations/callback/slack')}`
      }

      // デモ用：即座に連携成功とする
      integrationStatus[service] = true

      return NextResponse.json({
        success: true,
        message: `${service}と連携しました`,
        // authUrl: authUrls[service] // 実際のOAuth実装時に使用
      })
    } else if (action === 'disconnect') {
      integrationStatus[service] = false
      return NextResponse.json({
        success: true,
        message: `${service}の連携を解除しました`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Integration error:', error)
    return NextResponse.json({ error: 'Failed to process integration' }, { status: 500 })
  }
}
