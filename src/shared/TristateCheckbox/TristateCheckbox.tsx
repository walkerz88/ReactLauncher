import type { FC } from 'react';

import './TristateCheckbox.css';

export interface TristateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  /** Lets an external `<label htmlFor>` in a neighboring table cell target this checkbox. */
  id?: string;
}

/** A checkbox that can also show the "some, not all" dash state — React has no `indeterminate` prop, so
 * it's set as a DOM property through the ref callback. Used for a table's "select all". */
export const TristateCheckbox: FC<TristateCheckboxProps> = ({ checked, indeterminate, ariaLabel, onChange, id }) => {
  return (
    <input
      id={id}
      type="checkbox"
      className="tristate-checkbox"
      checked={checked}
      ref={(node) => {
        if (node) {
          node.indeterminate = indeterminate;
        }
      }}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={ariaLabel}
      data-id="TristateCheckbox"
      data-gamepad-focusable
    />
  );
};
