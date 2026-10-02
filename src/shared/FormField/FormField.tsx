import type { FC, ReactNode } from 'react';

import './FormField.css';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
  /** Optional control (e.g. a small icon button) shown on the label row, right of the label. */
  action?: ReactNode;
}

/** Labeled wrapper for a single form control — `<span>label</span>` above the input/select/textarea.
 * `action` is placed after the control in the DOM (so the label still points at the control, not at the
 * button) and moved up beside the label with CSS. */
export const FormField: FC<FormFieldProps> = ({ label, children, className, action }) => {
  return (
    <label className={['form-field', action ? 'form-field--with-action' : '', className].filter(Boolean).join(' ')} data-id="FormField">
      <span>{label}</span>
      {children}
      {action ? <span className="form-field__action">{action}</span> : null}
    </label>
  );
};
