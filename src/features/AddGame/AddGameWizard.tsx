import { useState, type FC } from 'react';
import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from '@/app/i18n';
import { reportProgress } from '@/app/lib/progressEvents';
import { useContentStore } from '@/app/store/contentStore';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';
import type { PathField as PathFieldName } from '@/electron';
import { Button } from '@/shared/Button';

import { BasicsStep } from './components/BasicsStep';
import { DownloadDirStep } from './components/DownloadDirStep';
import { FilesStep } from './components/FilesStep';
import { ModeStep } from './components/ModeStep';
import { PathsStep } from './components/PathsStep';
import { StructureStep } from './components/StructureStep';
import { TorrentStep } from './components/TorrentStep';
import {
  buildConfig,
  EMPTY_BASICS,
  EMPTY_PATHS,
  EMPTY_TORRENT,
  toTorrentSource,
  type AddMode,
  type BasicsDraft,
  type PathsDraft,
  type TorrentDraft,
} from './draft';

import './AddGame.css';

export interface AddGameWizardProps {
  /** Skips the "by hand or by torrent" question and starts that flow right away. */
  initialMode?: AddMode;
  onClose: () => void;
}

const STEP_LABELS = {
  torrent: 'addGame.step.torrent',
  basics: 'addGame.step.basics',
  structure: 'addGame.step.structure',
  download: 'addGame.step.download',
  files: 'addGame.step.files',
  paths: 'addGame.step.paths',
} as const;

type StepId = keyof typeof STEP_LABELS;

const MANUAL_STEPS: StepId[] = ['basics', 'structure', 'files', 'paths'];
const TORRENT_STEPS: StepId[] = ['torrent', 'basics', 'structure', 'download', 'files', 'paths'];

/**
 * Step-by-step "add a game" flow: [how: by hand or by torrent →] [torrent source →] basics → create folders →
 * [download folder →] where to put files → file paths. With torrent adding switched off in the settings the "how" question is skipped.
 */
export const AddGameWizard: FC<AddGameWizardProps> = ({ initialMode, onClose }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const libraryDir = useContentStore((state) => state.dir);
  const loadApps = useContentStore((state) => state.loadApps);
  const torrentEnabled = useSectionsStore((state) => state.torrentEnabled);

  const [mode, setMode] = useState<AddMode | null>(initialMode ?? (torrentEnabled ? null : 'manual'));
  const [stepIndex, setStepIndex] = useState(0);
  const [basics, setBasics] = useState<BasicsDraft>(EMPTY_BASICS);
  const [paths, setPaths] = useState<PathsDraft>(EMPTY_PATHS);
  const [torrent, setTorrent] = useState<TorrentDraft>(EMPTY_TORRENT);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [downloadDir, setDownloadDir] = useState<string | null>(null);
  const [torrentStarted, setTorrentStarted] = useState(false);
  const [assetsStatus, setAssetsStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = mode === 'torrent' ? TORRENT_STEPS : MANUAL_STEPS;
  const lastStep = steps.length - 1;
  const step = steps[stepIndex];
  const nameFilled = basics.name.trim().length > 0;

  const goToStep = (index: number) => {
    setError(null);
    setStepIndex(index);
  };

  /** Runs in the background (the trailer alone can take a while); the folder is rescanned when it ends. */
  const downloadAssets = async (id: string, steamAppId: string) => {
    setAssetsStatus('loading');

    try {
      const result = await window.electronAPI.content.downloadSteamAssets(id, steamAppId);

      setAssetsStatus(result?.covers || result?.screenshots || result?.trailer ? 'done' : 'failed');
      void loadApps();
    } catch {
      setAssetsStatus('failed');
    }
  };

  /** Creates the game folder; resolves to its id, or `null` (with the error shown) if that failed. */
  const createFolders = async (): Promise<string | null> => {
    try {
      const result = await window.electronAPI.content.createApp(basics.name.trim(), buildConfig(basics, EMPTY_PATHS));

      if (result.ok && result.id) {
        setFolderId(result.id);
        void reportProgress('game', result.id);

        if (basics.steamAppId) {
          void downloadAssets(result.id, basics.steamAppId);
        }

        // Rescan right away: the user may close the wizard at any point, and the new folder should already be in the gallery.
        void loadApps();

        return result.id;
      }

      setError(result.error ?? t('addGame.saveFailed'));

      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addGame.saveFailed'));

      return null;
    }
  };

  /** Starts the torrent into the chosen folder (the game's `data/` by default); if this fails, "Next" simply retries it. */
  const startTorrent = async (id: string): Promise<boolean> => {
    const source = toTorrentSource(torrent);

    if (!source) {
      return true;
    }

    try {
      const result = await window.electronAPI.torrents.add(source, id, downloadDir ?? undefined);

      if (result.ok) {
        setTorrentStarted(true);

        return true;
      }

      setError(result.error);

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));

      return false;
    }
  };

  /** Creates the game folder on "Next" from the folders step. */
  const ensureFolders = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);

    try {
      return Boolean(folderId ?? (await createFolders()));
    } finally {
      setBusy(false);
    }
  };

  /** Starts the download on "Next" from the download step (once). */
  const ensureTorrent = async (): Promise<boolean> => {
    if (!folderId || torrentStarted) {
      return true;
    }

    setBusy(true);
    setError(null);

    try {
      return await startTorrent(folderId);
    } finally {
      setBusy(false);
    }
  };

  const openFolder = async () => {
    if (!folderId) {
      return;
    }

    try {
      await window.electronAPI.content.openAppFolder(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const browsePath = async (field: PathFieldName, fieldMode: 'file' | 'folder') => {
    if (!folderId) {
      return;
    }

    try {
      const result = await window.electronAPI.content.pickPath(folderId, field, fieldMode);

      if (result.ok && result.path) {
        setPaths((prev) => ({ ...prev, [field]: result.path }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const finish = async () => {
    if (!folderId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await window.electronAPI.content.writeConfig(folderId, buildConfig(basics, paths));

      if (!result.ok) {
        setError(result.error ?? t('addGame.saveFailed'));

        return;
      }

      await loadApps();
      onClose();
      navigate(`/app/${encodeURIComponent(folderId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addGame.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const canGoNext = step === 'torrent' ? torrent.info !== null : step === 'basics' ? nameFilled : true;

  const handleNext = async () => {
    if (stepIndex === lastStep) {
      await finish();

      return;
    }

    if (step === 'structure' && !(await ensureFolders())) {
      return;
    }

    if (step === 'download' && !(await ensureTorrent())) {
      return;
    }

    goToStep(stepIndex + 1);
  };

  const suggestName = (name: string) => {
    setBasics((prev) => (prev.name.trim() ? prev : { ...prev, name }));
  };

  const selectMode = (selected: AddMode) => {
    setError(null);
    setStepIndex(0);
    setMode(selected);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      setMode(null);

      return;
    }

    goToStep(stepIndex - 1);
  };

  const cancelButton = (
    <Button type="button" className="add-game__cancel" onClick={onClose} data-gamepad-focusable>
      {t('addGame.cancel')}
    </Button>
  );

  const footer =
    mode === null ? (
      cancelButton
    ) : (
      <>
        {cancelButton}
        {step === 'files' ? (
          <Button type="button" onClick={() => void openFolder()} data-gamepad-focusable>
            <FolderOpen size={16} />
            {t('addGame.files.open')}
          </Button>
        ) : stepIndex > 0 || (torrentEnabled && !initialMode) ? (
          <Button type="button" disabled={busy} onClick={goBack} data-gamepad-focusable>
            {t('addGame.back')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="accent"
          disabled={!canGoNext || busy}
          onClick={() => void handleNext()}
          data-gamepad-focusable
        >
          {stepIndex === lastStep
            ? busy
              ? t('addGame.finishing')
              : t('addGame.finish')
            : busy && step === 'structure'
              ? t('addGame.structure.creating')
              : busy && step === 'download'
                ? t('addGame.download.starting')
                : t('addGame.next')}
        </Button>
      </>
    );

  return (
    <Modal
      title={t('addGame.title')}
      ariaLabel={t('addGame.title')}
      onClose={onClose}
      className="add-game"
      footer={footer}
      closeOnOverlayClick={false}
    >
      <div data-id="AddGameWizard">
        {mode === null ? (
          <ModeStep onSelect={selectMode} />
        ) : (
          <>
            <ol className="add-game__steps">
              {steps.map((id, index) => (
                <li
                  key={id}
                  className={[
                    'add-game__step',
                    index === stepIndex ? 'add-game__step--active' : '',
                    index < stepIndex ? 'add-game__step--done' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={index === stepIndex ? 'step' : undefined}
                >
                  <span className="add-game__step-number">{index + 1}</span>
                  {t(STEP_LABELS[id])}
                </li>
              ))}
            </ol>

            {step === 'torrent' ? (
              <TorrentStep
                torrent={torrent}
                onChange={(patch) => setTorrent((prev) => ({ ...prev, ...patch }))}
                onSuggestName={suggestName}
              />
            ) : null}

            {step === 'basics' ? (
              <BasicsStep basics={basics} onChange={(patch) => setBasics((prev) => ({ ...prev, ...patch }))} />
            ) : null}

            {step === 'structure' ? <StructureStep libraryDir={libraryDir} title={basics.name.trim()} /> : null}

            {step === 'download' && folderId ? (
              <DownloadDirStep
                gameId={folderId}
                downloadDir={downloadDir}
                locked={torrentStarted}
                onChange={setDownloadDir}
              />
            ) : null}

            {step === 'files' ? (
              <FilesStep assetsStatus={assetsStatus} torrentGameId={torrentStarted ? folderId : null} />
            ) : null}

            {step === 'paths' && folderId ? (
              <PathsStep
                paths={paths}
                folderId={folderId}
                onChange={(patch) => setPaths((prev) => ({ ...prev, ...patch }))}
                onBrowse={(field, fieldMode) => void browsePath(field, fieldMode)}
              />
            ) : null}
          </>
        )}

        {error ? <Message type="error">{error}</Message> : null}
      </div>
    </Modal>
  );
};
