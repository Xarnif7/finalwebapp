// Feature flag management for Blipp dashboard
// This provides a centralized way to manage feature flags across the application

export const FEATURE_FLAGS = {
  PUBLIC_FEEDBACK_ENABLED: 'PUBLIC_FEEDBACK_ENABLED',
  // Add more feature flags here as needed
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 * Checks in order: localStorage, environment variables, default (false)
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check localStorage first (for runtime toggles)
  const localValue = localStorage.getItem(FEATURE_FLAGS[flag]);
  if (localValue !== null) {
    return localValue === 'true';
  }
  
  // Check environment variables (for build-time configuration)
  const envKey = `VITE_${FEATURE_FLAGS[flag]}`;
  const envValue = import.meta.env[envKey];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  // Default to false
  return false;
};

/**
 * Enable a feature flag at runtime
 */
export const enableFeature = (flag: FeatureFlag): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FEATURE_FLAGS[flag], 'true');
    // Trigger a custom event to notify components of the change
    window.dispatchEvent(new CustomEvent('featureFlagChanged', { 
      detail: { flag, enabled: true } 
    }));
  }
};

/**
 * Disable a feature flag at runtime
 */
export const disableFeature = (flag: FeatureFlag): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FEATURE_FLAGS[flag], 'false');
    // Trigger a custom event to notify components of the change
    window.dispatchEvent(new CustomEvent('featureFlagChanged', { 
      detail: { flag, enabled: false } 
    }));
  }
};

/**
 * Toggle a feature flag at runtime
 */
export const toggleFeature = (flag: FeatureFlag): boolean => {
  const currentValue = isFeatureEnabled(flag);
  if (currentValue) {
    disableFeature(flag);
  } else {
    enableFeature(flag);
  }
  return !currentValue;
};

/**
 * Get all feature flags and their current state
 */
export const getAllFeatureFlags = (): Record<string, boolean> => {
  const flags: Record<string, boolean> = {};
  Object.keys(FEATURE_FLAGS).forEach(flag => {
    flags[flag] = isFeatureEnabled(flag as FeatureFlag);
  });
  return flags;
};

/**
 * Hook for React components to listen to feature flag changes
 */
export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const [enabled, setEnabled] = React.useState(() => isFeatureEnabled(flag));
  
  React.useEffect(() => {
    const handleFlagChange = (event: CustomEvent) => {
      if (event.detail.flag === flag) {
        setEnabled(event.detail.enabled);
      }
    };
    
    window.addEventListener('featureFlagChanged', handleFlagChange as EventListener);
    return () => {
      window.removeEventListener('featureFlagChanged', handleFlagChange as EventListener);
    };
  }, [flag]);
  
  return enabled;
};

// Import React for the hook
import React from 'react';