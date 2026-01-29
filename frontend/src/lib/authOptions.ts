import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

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
    // 開発用のCredentials認証
    CredentialsProvider({
      name: 'Development Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'watanabe@fanvest.co.jp' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 開発環境用の簡易認証
        const users = [
          {
            id: 'user-1',
            email: 'watanabe@fanvest.co.jp',
            password: 'dev123',
            name: '渡邊和則',
          },
          {
            id: 'user-2',
            email: 'fujiwara.t@fanvest.co.jp',
            password: 'dev123',
            name: '藤原',
          },
        ];

        const user = users.find(
          (u) => u.email === credentials?.email && u.password === credentials?.password
        );

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
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
  secret: process.env.NEXTAUTH_SECRET || 'executy-secret-key-change-in-production',
};
