import { forwardRef, type ButtonHTMLAttributes } from 'react';

import './IconButton.css';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ className, ...rest }, ref) => (
  <button ref={ref} className={['icon-btn', className].filter(Boolean).join(' ')} {...rest} />
));

IconButton.displayName = 'IconButton';
