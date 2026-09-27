import type { ReactNode } from 'react';

import './ToggleGroup.css';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface ToggleGroupProps<T extends string> {
  options: ReadonlyArray<ToggleGroupOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * A `role="group"` row of pressed/unpressed buttons for picking one value from a small set
 * (theme, language, …). Generic over the option's value type, so it can't be typed as `FC<Props>`.
 */
export const ToggleGroup = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ToggleGroupProps<T>) => {
  return (
    <div
      className={['toggle-group', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={ariaLabel}
      data-id="ToggleGroup"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="toggle-group__option"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
