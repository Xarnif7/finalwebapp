import React from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import '../index.css';

interface AppProps {
  Component: React.ComponentType<any>;
  pageProps: any;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;