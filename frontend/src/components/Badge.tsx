import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
  className?: string;
}

const variants = {
  success: 'bg-green-900 text-green-300 border-green-700',
  warning: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  danger: 'bg-red-900 text-red-300 border-red-700',
  info: 'bg-blue-900 text-blue-300 border-blue-700',
  neutral: 'bg-gray-700 text-gray-300 border-gray-600',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
