import type { FC } from 'react';

import { Switch } from '@/shared/Switch';

import './SwitchField.css';

export interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** An on/off `Switch` with a label next to it — a `<label>` wrapper so clicking the text toggles it
 * too, not just the switch itself (a `<button>` is a labelable element, so the browser forwards the
 * click for us; no extra handler needed, and clicking the switch directly still toggles only once). */
export const SwitchField: FC<SwitchFieldProps> = ({ label, checked, onChange }) => {
  return (
    <label className="switch-field" data-id="SwitchField">
      <Switch checked={checked} ariaLabel={label} onChange={onChange} />
      <span className="switch-field__label">{label}</span>
    </label>
  );
};
