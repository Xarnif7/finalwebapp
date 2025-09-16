import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ViewPlansButtonProps {
  variant?: 'inline' | 'header';
  className?: string;
}

export function ViewPlansButton({ variant = 'inline', className = '' }: ViewPlansButtonProps) {
  const baseClasses = "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300";
  
  const sizeClasses = variant === 'header' 
    ? "px-6 py-2 text-sm font-medium rounded-xl" 
    : "px-10 py-6 text-lg font-semibold rounded-2xl";
  
  const finalClasses = `${baseClasses} ${sizeClasses} ${className}`;

  return (
    <Button asChild className={finalClasses}>
      <Link to="/pricing">
        View Plans
      </Link>
    </Button>
  );
}
