export const featureFlags = {
  conversationsLite: (import.meta.env.VITE_FEATURE_CONVERSATIONS_LITE ?? 'false') === 'true',
};

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  return !!featureFlags[flag];
}


