import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// 許可するメールドメイン（環境変数で設定可能）
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'fanvest.co.jp').split(',').map(d => d.trim());

export const authOptions: AuthOptions = {
  providers: [
    // Google認証（Calendar, Gmail, Profileスコープ付き）
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
    // サインイン時にドメインチェック
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
      if (user) {
        token.id = user.id;
      }
      // Google認証時にアクセストークンとリフレッシュトークンを保存
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        token.provider = account.provider;
      }
      return token;
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
