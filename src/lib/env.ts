export function getEnv(name: string): string | undefined {
  // Vite exposes env via import.meta.env
  const v = (import.meta as any).env?.[name] ?? (import.meta as any).env?.[`VITE_${name}`];
  return typeof v === 'string' ? v : undefined;
}

const required = [
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'APP_BASE_URL',
];

export function validateEnv({ isProd }: { isProd: boolean }) {
  const missing = required.filter((k) => !getEnv(k));
  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProd) {
      throw new Error(msg);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[env] ${msg}`);
    }
  }
}


