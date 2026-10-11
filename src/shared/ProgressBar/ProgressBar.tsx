import type { FC } from 'react';

import './ProgressBar.css';

export interface ProgressBarProps {
  /** 0–1 */
  value: number;
  label: string;
  /** Dims the bar (a paused or failed download). */
  muted?: boolean;
  className?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({ value, label, muted, className }) => {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div
      className={['progress-bar', muted ? 'progress-bar--muted' : '', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-id="ProgressBar"
    >
      <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  );
};
