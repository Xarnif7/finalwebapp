import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '../../../hooks/useSubscriptionStatus';
import { getCTADecision } from '../../../lib/cta-utils';
import { signInWithGoogle } from '../../../lib/auth-utils';

interface PrimaryCTAProps {
  className?: string;
}

export function PrimaryCTA({ className = '' }: PrimaryCTAProps) {
  const navigate = useNavigate();
  const { status: authStatus, user } = useAuth();
  const { active: hasActive, loading: subLoading } = useSubscriptionStatus();
  
  const ctaDecision = getCTADecision({
    status: authStatus === 'loading' || subLoading ? 'loading' : authStatus,
    hasActive: hasActive || false,
  });

  const handlePrimaryClick = async () => {
    if (ctaDecision.primary.action === 'signin') {
      await signInWithGoogle();
      return;
    }
    navigate(ctaDecision.primary.href);
  };

  const handleSecondaryClick = async () => {
    if (ctaDecision.secondary?.action === 'signin') {
      await signInWithGoogle();
      return;
    }
    if (ctaDecision.secondary?.href) navigate(ctaDecision.secondary.href);
  };

  // Loading state - show skeleton buttons
  if (authStatus === 'loading' || subLoading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Button
        onClick={handlePrimaryClick}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 text-sm font-medium rounded-xl"
      >
        {ctaDecision.primary.label}
      </Button>
      
      {ctaDecision.secondary && (
        <Button
          variant="ghost"
          onClick={handleSecondaryClick}
          className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300"
        >
          {ctaDecision.secondary.label}
        </Button>
      )}
    </div>
  );
}
