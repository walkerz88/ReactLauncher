import type { FC, ReactNode } from 'react';

import './FormField.css';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
  /** Optional control (e.g. a small icon button) shown on the label row, right of the label. */
  action?: ReactNode;
}

/** Labeled wrapper for a single form control — `<span>label</span>` above the input/select/textarea. */
export const FormField: FC<FormFieldProps> = ({ label, children, className, action }) => {
  return (
    <label className={['form-field', className].filter(Boolean).join(' ')} data-id="FormField">
      {action ? (
        <span className="form-field__head">
          <span>{label}</span>
          {action}
        </span>
      ) : (
        <span>{label}</span>
      )}
      {children}
    </label>
  );
};
