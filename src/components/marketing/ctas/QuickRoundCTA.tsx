import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface QuickRoundCTAProps {
  variant?: 'inline' | 'header';
  className?: string;
  onClick?: () => void;
}

export function QuickRoundCTA({ variant = 'inline', className = '', onClick }: QuickRoundCTAProps) {
  const baseClasses = "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300";
  
  const sizeClasses = variant === 'header' 
    ? "w-10 h-10 rounded-full p-0" 
    : "w-12 h-12 rounded-full p-0";
  
  const finalClasses = `${baseClasses} ${sizeClasses} ${className}`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default action - scroll to pricing or trigger sign up
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = '/pricing';
      }
    }
  };

  return (
    <Button 
      onClick={handleClick}
      className={finalClasses}
      aria-label="Quick action - view pricing"
    >
      <ArrowRight className="w-4 h-4" />
    </Button>
  );
}
