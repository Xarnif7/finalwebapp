import type { AppProps } from 'next/app';
import React from 'react';
// IMPORTANT: Do not duplicate—import from this path only.
import { AuthProvider } from '@/components/auth/AuthProvider';
import '@/index.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}


