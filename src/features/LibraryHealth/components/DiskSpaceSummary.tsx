import { useEffect, useState, type FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { formatFileSize } from '@/app/lib/format';
import type { DiskSpace } from '@/electron';

interface DiskSpaceSummaryProps {
  /** Bumping this re-runs the disk space read (e.g. the user hit the rescan button next to the table). */
  reloadKey?: number;
}

/** Total/used/free space of the drive `./content` lives on, as one two-colour bar — a single OS call
 * (the volume's own free-space counter), not a walk of any folder, so it's effectively free next to the
 * per-game size scan and is fetched once up front rather than tied to that scan's progress. */
export const DiskSpaceSummary: FC<DiskSpaceSummaryProps> = ({ reloadKey }) => {
  const t = useTranslation();
  const [space, setSpace] = useState<DiskSpace | null | 'failed'>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await window.electronAPI?.content.diskSpace();

        if (!cancelled) {
          setSpace(result ?? 'failed');
        }
      } catch (err) {
        console.error('Reading disk space failed:', err);

        if (!cancelled) {
          setSpace('failed');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (!space || space === 'failed') {
    return null;
  }

  const used = Math.max(0, space.total - space.free);
  const usedPercent = space.total > 0 ? (used / space.total) * 100 : 0;

  return (
    <div className="library-health__disk-space" data-id="DiskSpaceSummary">
      <div className="library-health__disk-space-stats">
        <span>
          {t('health.sizes.diskTotal')} <strong>{formatFileSize(space.total)}</strong>
        </span>
        <span>
          {t('health.sizes.diskUsed')} <strong>{formatFileSize(used)}</strong>
        </span>
        <span>
          {t('health.sizes.diskFree')} <strong>{formatFileSize(space.free)}</strong>
        </span>
      </div>

      <div className="library-health__disk-space-bar">
        <div className="library-health__disk-space-bar-used" style={{ width: `${usedPercent}%` }} />
        <div className="library-health__disk-space-bar-free" style={{ width: `${100 - usedPercent}%` }} />
      </div>
    </div>
  );
};
