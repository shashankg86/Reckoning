import React, { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
}

export function FAB({ onClick, icon = <Plus className="h-6 w-6" />, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 lg:bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600',
        'text-white rounded-full shadow-lg hover:shadow-xl transition-all',
        'flex items-center justify-center z-40 focus:outline-none focus:ring-2',
        'focus:ring-offset-2 focus:ring-orange-500',
        className
      )}
    >
      {icon}
    </button>
  );
}