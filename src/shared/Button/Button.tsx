import { forwardRef, type ButtonHTMLAttributes } from 'react';

import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'danger';
  small?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, small, className, ...rest }, ref) => (
  <button
    ref={ref}
    className={['btn', variant ? `btn--${variant}` : '', small ? 'btn--small' : '', className].filter(Boolean).join(' ')}
    {...rest}
  />
));

Button.displayName = 'Button';
