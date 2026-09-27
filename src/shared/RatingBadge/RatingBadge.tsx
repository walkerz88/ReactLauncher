import type { FC } from 'react';
import { Star } from 'lucide-react';

import './RatingBadge.css';

export interface RatingBadgeProps {
  /** 0-10 scale. */
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const RatingBadge: FC<RatingBadgeProps> = ({ rating, size = 'sm', className }) => {
  const classes = ['rating-badge', `rating-badge--${size}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} data-id="RatingBadge">
      <Star size={size === 'sm' ? 11 : 14} fill="currentColor" strokeWidth={0} />
      {rating.toFixed(1)}
    </span>
  );
};
