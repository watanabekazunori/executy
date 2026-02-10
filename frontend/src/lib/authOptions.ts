import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// 許可するメールドメイン（環境変数で設定可能）
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'fanvest.co.jp').split(',').map(d => d.trim());

// Googleアクセストークンのリフレッシュ
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const tokens = await response.json();
    if (!response.ok) throw tokens;

    return {
      ...token,
      accessToken: tokens.access_token,
      accessTokenExpires: Date.now() + tokens.expires_in * 1000,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.compose',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        const email = profile?.email || '';
        const domain = email.split('@')[1];
        if (!ALLOWED_DOMAINS.includes(domain)) {
          return '/login?error=AccessDenied';
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 初回ログイン時
      if (account) {
        return {
          ...token,
          id: user?.id,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          provider: account.provider,
        };
      }

      // トークンがまだ有効な場合はそのまま返す
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // トークンが期限切れの場合はリフレッシュ
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
