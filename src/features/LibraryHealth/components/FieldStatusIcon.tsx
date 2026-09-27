import { Check, Minus, TriangleAlert, X } from 'lucide-react';
import type { FC } from 'react';

import { type FieldStatus } from '@/app/lib/libraryHealth';
import { Tooltip } from '@/shared/Tooltip';

const STATUS_ICONS: Record<FieldStatus, typeof Check> = { ok: Check, missing: X, warning: TriangleAlert, none: Minus };

interface FieldStatusIconProps {
  status: FieldStatus;
  label: string;
  /** Set to `false` when the caller already wraps this icon in its own tooltip (e.g. the disk-usage
   * table's column-name tooltip) — otherwise hovering the icon would pop up two tooltips at once. */
  withTooltip?: boolean;
}

/** One cell's status for one game — an icon standing in for "filled in" / "missing" / "filled in, but
 * flagged" (a language-swap check) / "empty, and that's fine" (optional fields only). Shared between the
 * field-completeness table and the disk-usage table. */
export const FieldStatusIcon: FC<FieldStatusIconProps> = ({ status, label, withTooltip = true }) => {
  const Icon = STATUS_ICONS[status];

  const icon = (
    <span className={`library-health__field-status library-health__field-status--${status}`} aria-label={label}>
      <Icon size={14} aria-hidden="true" />
    </span>
  );

  return withTooltip ? <Tooltip label={label}>{icon}</Tooltip> : icon;
};
