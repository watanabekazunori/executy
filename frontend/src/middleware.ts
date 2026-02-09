import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PRODUCTION_DOMAIN = 'aide-blond.vercel.app';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // 1. デプロイメント固有のVercel URLからプロダクションドメインへリダイレクト
  //    これにより、NextAuthが常に正しいcallback URLを生成する
  if (
    host !== PRODUCTION_DOMAIN &&
    !host.startsWith('localhost') &&
    !host.startsWith('127.0.0.1') &&
    host.endsWith('.vercel.app')
  ) {
    const url = request.nextUrl.clone();
    url.host = PRODUCTION_DOMAIN;
    url.protocol = 'https';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // 2. 公開ルート（認証不要）はスキップ
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // 3. 認証チェック（保護されたルートのみ）
  const token = await getToken({ req: request });
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的ファイルを除く全ルートに適用（リダイレクトは全ルート、認証チェックは保護ルートのみ）
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
