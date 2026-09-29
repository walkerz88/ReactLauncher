import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AboutFactRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  onOpen?: (href: string) => void;
}

export const AboutFactRow: FC<AboutFactRowProps> = ({ icon: Icon, label, value, href, onOpen }) => (
  <div className="about-section__row">
    <Icon className="about-section__row-icon" size={16} />
    <dt>{label}</dt>
    <dd>
      {href ? (
        <button type="button" className="about-section__link" onClick={() => onOpen?.(href)}>
          {value}
        </button>
      ) : (
        value
      )}
    </dd>
  </div>
);
