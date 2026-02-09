import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // 認証が必要なルートを指定（login, api/auth, _next, staticファイルを除外）
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
