import type { FC } from 'react';

import './Switch.css';

export interface SwitchProps {
  checked: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}

/** A `role="switch"` on/off control (see `WelcomeAnimationToggle`). */
export const Switch: FC<SwitchProps> = ({ checked, ariaLabel, onChange }) => {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-id="Switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  );
};
