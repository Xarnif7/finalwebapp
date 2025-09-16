export interface CTAState {
  status: 'loading' | 'signedOut' | 'signedIn';
  hasActive: boolean;
}

export interface CTADecision {
  primary: {
    label: string;
    href: string;
    action: 'signin' | 'pricing' | 'dashboard';
  };
  secondary?: {
    label: string;
    href: string;
    action: 'signin';
  };
  showAvatar: boolean;
}

export function getCTADecision({ status, hasActive }: CTAState): CTADecision {
  // Loading state
  if (status === 'loading') {
    return {
      primary: { label: 'Loading...', href: '#', action: 'signin' },
      secondary: { label: 'Loading...', href: '#', action: 'signin' },
      showAvatar: false,
    };
  }

  // Signed out state
  if (status === 'signedOut') {
    return {
      primary: { 
        label: 'Sign in', 
        href: '/login?next=/pricing', 
        action: 'signin' 
      },
      secondary: { 
        label: 'Get Started', 
        href: '/login?next=/pricing', 
        action: 'signin' 
      },
      showAvatar: false,
    };
  }

  // Signed in state
  if (status === 'signedIn') {
    if (hasActive) {
      // Has active subscription
      return {
        primary: { 
          label: 'View Dashboard', 
          href: '/dashboard', 
          action: 'dashboard' 
        },
        showAvatar: true,
      };
    } else {
      // No active subscription
      return {
        primary: { 
          label: 'Get Started', 
          href: '/pricing', 
          action: 'pricing' 
        },
        showAvatar: true,
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    primary: { label: 'Sign in', href: '/login?next=/pricing', action: 'signin' },
    secondary: { label: 'Get Started', href: '/login?next=/pricing', action: 'signin' },
    showAvatar: false,
  };
}
