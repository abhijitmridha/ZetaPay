'use client';

import { PersonTypeBadgeProps, TYPE_COLORS, TYPE_LABELS } from '@/types/person';

export function PersonTypeBadge({ type, className = '' }: PersonTypeBadgeProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]} ${className}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}
