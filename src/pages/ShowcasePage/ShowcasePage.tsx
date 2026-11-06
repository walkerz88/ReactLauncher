import { useEffect, useState, type FC } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { CheckCircle, GripVertical, List, Plus, ShoppingBag, Trash2, XCircle } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { useShowcaseStore, type ShowcaseEntry } from '@/app/store/showcaseStore';
import { Button } from '@/shared/Button';
import { CardSkeleton } from '@/shared/CardSkeleton';
import { IconButton } from '@/shared/IconButton';
import { ShowcaseGrid } from '@/widgets/ShowcaseGrid';
import { SidePanel } from '@/shared/SidePanel';
import { Tooltip } from '@/shared/Tooltip';

import './ShowcasePage.css';

const ShowcaseRow: FC<{
  entry: ShowcaseEntry;
  onRemove: (id: string) => void;
}> = ({ entry, onRemove }) => {
  const t = useTranslation();
  const dragControls = useDragControls();

  const statusIcon =
    entry.status === 'loaded' ? (
      <Tooltip label={t('showcase.statusLoaded')}>
        <CheckCircle size={14} className="showcase-row__status showcase-row__status--loaded" />
      </Tooltip>
    ) : entry.status === 'error' ? (
      <Tooltip label={t('showcase.statusError')}>
        <XCircle size={14} className="showcase-row__status showcase-row__status--error" />
      </Tooltip>
    ) : entry.status === 'loading' ? (
      <Tooltip label={t('showcase.statusLoading')}>
        <span className="showcase-row__spinner" />
      </Tooltip>
    ) : null;

  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={dragControls}
      className="showcase-row"
      data-id="ShowcaseRow"
    >
      <button
        type="button"
        className="showcase-row__drag-handle"
        aria-label={t('editConfig.noteReorder')}
        onPointerDown={(event) => dragControls.start(event)}
      >
        <GripVertical size={14} />
      </button>
      {statusIcon}
      <span className="showcase-row__url">{entry.url}</span>
      <Tooltip label={t('showcase.remove')}>
        <IconButton className="showcase-row__remove" onClick={() => onRemove(entry.id)} aria-label={t('showcase.remove')}>
          <Trash2 size={12} />
        </IconButton>
      </Tooltip>
    </Reorder.Item>
  );
};

export const ShowcasePage: FC = () => {
  const t = useTranslation();
  const entries = useShowcaseStore((state) => state.entries);
  const addShowcase = useShowcaseStore((state) => state.addShowcase);
  const removeShowcase = useShowcaseStore((state) => state.removeShowcase);
  const reorderShowcases = useShowcaseStore((state) => state.reorderShowcases);
  const refreshShowcase = useShowcaseStore((state) => state.refreshShowcase);
  const getAllGames = useShowcaseStore((state) => state.getAllGames);
  const setEnabled = useSectionsStore((state) => state.setShowcaseEnabled);

  const [inputValue, setInputValue] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const allGames = getAllGames();
  const hasLoading = entries.some((e) => e.status === 'loading');
  const allLoaded = entries.length > 0 && !hasLoading && entries.every((e) => e.status === 'loaded' || e.status === 'error');

  useEffect(() => {
    for (const entry of entries) {
      if (entry.status === 'idle') {
        void refreshShowcase(entry.id);
      }
    }
  }, []);

  const handleAdd = async () => {
    const trimmed = inputValue.trim();

    if (!trimmed) return;

    setInputValue('');
    setEnabled(true);
    await addShowcase(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      void handleAdd();
    }
  };

  const openPanel = () => setPanelOpen(true);

  return (
    <div className="page page--scroll-pad" data-id="ShowcasePage">
      <div className="showcase-header">
        <h1 className="home-section__title">{t('showcase.title')}</h1>
        {entries.length > 0 ? (
          <Tooltip label={t('showcase.manage')}>
            <button
              type="button"
              className="showcase-plus"
              aria-label={t('showcase.manage')}
              onClick={openPanel}
              data-gamepad-focusable
            >
              <List size={18} />
            </button>
          </Tooltip>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="showcase-empty">
          <Tooltip label={t('showcase.add')}>
            <button
              type="button"
              className="showcase-empty__add"
              onClick={openPanel}
              data-gamepad-focusable
            >
              <Plus size={40} />
            </button>
          </Tooltip>
        </div>
      ) : hasLoading && allGames.length === 0 ? (
        <ul className="app-grid" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : allGames.length > 0 ? (
        <ShowcaseGrid games={allGames} />
      ) : allLoaded ? (
        <div className="showcase-empty">
          <div className="showcase-empty__content">
            <ShoppingBag size={64} className="showcase-empty__icon" />
            <p className="showcase-empty__text">{t('showcase.noGames')}</p>
          </div>
        </div>
      ) : null}

      <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={t('showcase.add')}>
        <div className="showcase-panel__content">
          <div className="showcase-input-row">
            <input
              type="text"
              className="showcase-input"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('showcase.urlPlaceholder')}
            />
            <Button
              className="showcase-load-btn"
              variant="accent"
              onClick={() => void handleAdd()}
              disabled={hasLoading || !inputValue.trim()}
            >
              {t('showcase.addShort')}
            </Button>
          </div>

          {entries.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={entries}
              onReorder={reorderShowcases}
              className="showcase-list"
            >
              {entries.map((entry) => (
                <ShowcaseRow key={entry.id} entry={entry} onRemove={removeShowcase} />
              ))}
            </Reorder.Group>
          ) : null}
        </div>
      </SidePanel>
    </div>
  );
};
