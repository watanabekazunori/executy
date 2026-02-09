'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Briefcase, AlertTriangle, Shield } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl });
  };

  const errorMessage = error === 'AccessDenied'
    ? '許可されていないアカウントです。社内Googleアカウントでログインしてください。'
    : error
    ? 'ログイン中にエラーが発生しました。もう一度お試しください。'
    : null;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
              Aide
            </h1>
            <p className="text-xs text-slate-500">AI Task Assistant</p>
          </div>
        </div>
        <p className="text-slate-600">AIタスク管理アシスタント</p>
      </div>

      <div className="card p-8">
        <h2 className="text-xl font-semibold text-center mb-6 text-slate-900">ログイン</h2>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        <p className="text-sm text-slate-500 text-center mb-6">
          社内Googleアカウントでログインしてください
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all rounded-xl py-3.5 flex items-center justify-center gap-3 font-medium text-slate-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Googleでログイン</span>
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          <span>組織アカウントのみアクセス可能</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-600">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
