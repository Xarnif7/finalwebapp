export const featureFlags = {
  conversationsLite: (import.meta.env.VITE_FEATURE_CONVERSATIONS_LITE ?? 'false') === 'true',
  replyCoach: (import.meta.env.VITE_WIP_REPLY_COACH ?? 'false') === 'true',
  rescueLane: (import.meta.env.VITE_WIP_RESCUE_LANE ?? 'false') === 'true',
  socialPipeline: (import.meta.env.VITE_WIP_SOCIAL_PIPELINE ?? 'false') === 'true',
  magicSend: (import.meta.env.VITE_WIP_MAGIC_SEND ?? 'false') === 'true',
  missedRecovery: (import.meta.env.VITE_WIP_MISSED_RECOVERY ?? 'false') === 'true',
  customersSegments: (import.meta.env.VITE_WIP_CUSTOMERS_SEGMENTS ?? 'false') === 'true',
};

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  return !!featureFlags[flag];
}


