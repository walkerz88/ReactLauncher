import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Magnet } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { useLocaleStore } from '@/app/store/localeStore';
import { useShowcaseStore } from '@/app/store/showcaseStore';
import { useTranslation } from '@/app/i18n';
import type { ShowcaseGame } from '@/electron';
import { RatingBadge } from '@/shared/RatingBadge';
import { Button } from '@/shared/Button';
import { ConfirmModal } from '@/shared/ConfirmModal';
import { MediaSection } from '@/pages/PreviewPage/components/MediaSection';
import { AddGameWizard } from '@/features/AddGame';
import type { BasicsDraft } from '@/features/AddGame/draft';

import './ShowcaseGamePage.css';

const localizeText = (value: { ru: string | null; en: string | null } | null, locale: string): string | null => {
  if (!value) return null;

  return value[locale as keyof typeof value] ?? value.en ?? value.ru;
};

const localizeTextPair = (value: { ru: string | null; en: string | null } | null): { ru?: string; en?: string } => {
  if (!value) return {};

  return {
    ru: value.ru ?? undefined,
    en: value.en ?? undefined,
  };
};

export const ShowcaseGamePage: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const getGame = useShowcaseStore((state) => state.getGame);
  const refreshAll = useShowcaseStore((state) => state.refreshAll);
  const entries = useShowcaseStore((state) => state.entries);
  const hasLoading = entries.some((e) => e.status === 'loading');

  const [game, setGame] = useState<ShowcaseGame | null>(null);
  const gameRef = useRef<ShowcaseGame | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [importedFolderId, setImportedFolderId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingFolderName, setPendingFolderName] = useState<string | null>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const found = getGame(id);

    if (found) {
      setGame(found);
      gameRef.current = found;
    } else if (!hasLoading && entries.length > 0) {
      void refreshAll().then(() => {
        const refreshed = getGame(id);
        setGame(refreshed);
        gameRef.current = refreshed;
      });
    }
  }, [id, getGame, hasLoading, entries.length, refreshAll]);

  useEffect(() => {
    if (game) {
      downloadButtonRef.current?.focus();
    }
  }, [game]);

  const doImport = async (overwrite: boolean) => {
    const currentGame = gameRef.current;

    if (!currentGame?.torrentMagnet) return;

    setImporting(true);

    try {
      const result = await window.electronAPI.showcase.import(currentGame.id, overwrite);

      if (result.ok && result.id) {
        setImportedFolderId(result.id);
        setShowWizard(true);
      } else if (result.error === 'exists') {
        setPendingFolderName(result.folderName ?? null);
        setShowOverwriteDialog(true);
      } else {
        console.error('Import failed:', result.error);
      }
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = () => {
    void doImport(false);
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteDialog(false);
    void doImport(true);
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteDialog(false);
    setPendingFolderName(null);
  };

  const handleShowFolder = async () => {
    if (!pendingFolderName) return;

    try {
      await window.electronAPI.showcase.openFolder(pendingFolderName);
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const buildInitialBasics = (g: ShowcaseGame): Partial<BasicsDraft> => {
    const description = g.description;

    return {
      name: g.name,
      genre: g.genre || '',
      rating: g.rating != null ? String(g.rating) : '',
      descriptionRu: description?.ru ?? '',
      descriptionEn: description?.en ?? '',
      facts: g.facts.map((fact) => ({
        label: localizeTextPair(fact.label),
        value: localizeTextPair(fact.value),
      })),
    };
  };

  if (!game) {
    const isLoading = hasLoading;

    if (isLoading) {
      return (
        <div className="app-page page--scroll-pad" data-id="ShowcaseGamePage">
          <div className="app-page__hero">
            <div className="app-page__hero-fill app-page__skeleton" />
            <button type="button" className="app-page__back" onClick={() => navigate('/showcase')}>
              <ArrowLeft size={16} />
              {t('showcase.back')}
            </button>
          </div>
          <div className="app-page__title-row">
            <div className="app-page__skeleton app-page__skeleton--title" />
          </div>
          <div className="app-page__actions">
            <div className="app-page__skeleton app-page__skeleton--button" />
          </div>
        </div>
      );
    }

    return (
      <div className="app-page page--scroll-pad" data-id="ShowcaseGamePage">
        <button
          type="button"
          className="app-page__back app-page__back--standalone"
          onClick={() => navigate('/showcase')}
        >
          <ArrowLeft size={16} />
          {t('showcase.back')}
        </button>
        <p className="app-page__note">{t('showcase.notFound')}</p>
      </div>
    );
  }

  const name = game.name;
  const description = localizeText(game.description, locale);
  const cover = game.coverHorizontal || game.coverVertical;

  return (
    <div className="app-page page--scroll-pad" data-id="ShowcaseGamePage">
      <div className="app-page__hero">
        {cover ? (
          <img src={cover} alt="" style={{ objectPosition: game.coverHorizontalPosition }} />
        ) : (
          <div className="app-page__hero-fallback">{name.charAt(0)}</div>
        )}
        <button type="button" className="app-page__back" onClick={() => navigate('/showcase')}>
          <ArrowLeft size={16} />
          {t('showcase.back')}
        </button>
      </div>

      <div className="app-page__title-row">
        <div className="app-page__title-group">
          <h1 className="app-page__title">{name}</h1>
          {game.rating != null ? <RatingBadge rating={game.rating} /> : null}
        </div>
      </div>

      <div className="app-page__actions">
        {game.torrentMagnet ? (
          <Button
            ref={downloadButtonRef}
            variant="accent"
            onClick={() => void handleDownload()}
            disabled={importing}
            data-gamepad-focusable
          >
            {importing ? <Loader2 size={18} className="spin" /> : <Magnet size={18} />}
            {t('showcase.download')}
          </Button>
        ) : null}
      </div>

      <div className="app-page__sections">
        {description ? (
          <div className="app-page__description instructions-modal__text">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{description}</ReactMarkdown>
          </div>
        ) : null}

        {game.facts.length > 0 ? (
          <dl className="app-page__facts">
            {game.facts.map((fact, index) => {
              const label = localizeText(fact.label, locale);
              const value = localizeText(fact.value, locale);

              if (!label || !value) return null;

              return (
                <div key={index} className="app-page__fact">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              );
            })}
          </dl>
        ) : null}

        <MediaSection screenshots={game.screenshots} trailer={game.trailer} />
      </div>

      {showWizard && game.torrentMagnet && importedFolderId ? (
        <AddGameWizard
          initialMode="torrent"
          initialStepIndex={0}
          initialTorrentMagnet={game.torrentMagnet}
          initialBasics={buildInitialBasics(game)}
          initialFolderId={importedFolderId}
          fromShowcase
          onClose={() => {
            setShowWizard(false);
            setImportedFolderId(null);
          }}
        />
      ) : null}

      {showOverwriteDialog ? (
        <ConfirmModal
          title={t('showcase.overwriteTitle')}
          message={t('showcase.overwriteMessage').replace('{name}', pendingFolderName ?? '')}
          infoMessage={t('showcase.overwriteInfo')}
          confirmLabel={t('showcase.overwriteConfirm')}
          cancelLabel={t('modal.close')}
          danger
          className="showcase-overwrite-modal"
          leftActions={
            <Button type="button" onClick={handleShowFolder} data-gamepad-focusable>
              {t('showcase.showFolder')}
            </Button>
          }
          onConfirm={handleOverwriteConfirm}
          onCancel={handleOverwriteCancel}
        />
      ) : null}
    </div>
  );
};
