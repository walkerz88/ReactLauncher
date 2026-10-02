import type { FC, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, Star, XCircle } from 'lucide-react';

import './Message.css';

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'award';

export interface MessageProps {
  type?: MessageType;
  children: ReactNode;
  className?: string;
  /** Replaces the type's icon with a spinner while something is in progress. */
  loading?: boolean;
}

const ICON_BY_TYPE: Record<MessageType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  award: Star,
};

export const Message: FC<MessageProps> = ({ type = 'info', children, className, loading }) => {
  const Icon = ICON_BY_TYPE[type];
  const classes = ['message', `message--${type}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} role={type === 'error' ? 'alert' : 'status'} data-id="Message">
      {loading ? (
        <Loader2 size={18} className="message__icon message__icon--spin" />
      ) : (
        <Icon size={18} className="message__icon" />
      )}
      <p className="message__text">{children}</p>
    </div>
  );
};
