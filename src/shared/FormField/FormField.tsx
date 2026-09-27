import type { FC, ReactNode } from 'react';

import './FormField.css';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** Labeled wrapper for a single form control — `<span>label</span>` above the input/select/textarea. */
export const FormField: FC<FormFieldProps> = ({ label, children, className }) => {
  return (
    <label className={['form-field', className].filter(Boolean).join(' ')} data-id="FormField">
      <span>{label}</span>
      {children}
    </label>
  );
};
