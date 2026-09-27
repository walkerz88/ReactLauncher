import { useState, type FC } from 'react';
import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from '@/app/i18n';
import { reportProgress } from '@/app/lib/progressEvents';
import { useContentStore } from '@/app/store/contentStore';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';
import type { PathField as PathFieldName } from '@/electron';

import { BasicsStep } from './components/BasicsStep';
import { FilesStep } from './components/FilesStep';
import { PathsStep } from './components/PathsStep';
import { StructureStep } from './components/StructureStep';
import { buildConfig, EMPTY_BASICS, EMPTY_PATHS, type BasicsDraft, type PathsDraft } from './draft';

import './AddGame.css';

export interface AddGameWizardProps {
  onClose: () => void;
}

const STEPS = [
  { id: 'basics', labelKey: 'addGame.step.basics' },
  { id: 'structure', labelKey: 'addGame.step.structure' },
  { id: 'files', labelKey: 'addGame.step.files' },
  { id: 'paths', labelKey: 'addGame.step.paths' },
] as const;

const LAST_STEP = STEPS.length - 1;

/** Step-by-step "add a game" flow: basics → create folders → where to put files → file paths. */
export const AddGameWizard: FC<AddGameWizardProps> = ({ onClose }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const libraryDir = useContentStore((state) => state.dir);
  const loadApps = useContentStore((state) => state.loadApps);

  const [stepIndex, setStepIndex] = useState(0);
  const [basics, setBasics] = useState<BasicsDraft>(EMPTY_BASICS);
  const [paths, setPaths] = useState<PathsDraft>(EMPTY_PATHS);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [assetsStatus, setAssetsStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex].id;
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

  /** Creates the game folder on "Next" from the folders step; resolves to whether the folder now exists. */
  const ensureFolders = async (): Promise<boolean> => {
    if (folderId) {
      return true;
    }

    setBusy(true);
    setError(null);

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

        return true;
      }

      setError(result.error ?? t('addGame.saveFailed'));

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addGame.saveFailed'));

      return false;
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

  const browsePath = async (field: PathFieldName, mode: 'file' | 'folder') => {
    if (!folderId) {
      return;
    }

    try {
      const result = await window.electronAPI.content.pickPath(folderId, field, mode);

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

  const canGoNext = step === 'basics' ? nameFilled : true;

  const handleNext = async () => {
    if (stepIndex === LAST_STEP) {
      await finish();

      return;
    }

    if (step === 'structure' && !(await ensureFolders())) {
      return;
    }

    goToStep(stepIndex + 1);
  };

  const footer = (
    <>
      <button type="button" className="btn add-game__cancel" onClick={onClose} data-gamepad-focusable>
        {t('addGame.cancel')}
      </button>
      {step === 'files' ? (
        <button type="button" className="btn" onClick={() => void openFolder()} data-gamepad-focusable>
          <FolderOpen size={16} />
          {t('addGame.files.open')}
        </button>
      ) : stepIndex > 0 ? (
        <button type="button" className="btn" disabled={busy} onClick={() => goToStep(stepIndex - 1)} data-gamepad-focusable>
          {t('addGame.back')}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn--accent"
        disabled={!canGoNext || busy}
        onClick={() => void handleNext()}
        data-gamepad-focusable
      >
        {stepIndex === LAST_STEP
          ? busy
            ? t('addGame.finishing')
            : t('addGame.finish')
          : busy && step === 'structure'
            ? t('addGame.structure.creating')
            : t('addGame.next')}
      </button>
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
        <ol className="add-game__steps">
          {STEPS.map(({ id, labelKey }, index) => (
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
              {t(labelKey)}
            </li>
          ))}
        </ol>

        {step === 'basics' ? (
          <BasicsStep basics={basics} onChange={(patch) => setBasics((prev) => ({ ...prev, ...patch }))} />
        ) : null}

        {step === 'structure' ? <StructureStep libraryDir={libraryDir} title={basics.name.trim()} /> : null}

        {step === 'files' ? <FilesStep assetsStatus={assetsStatus} /> : null}

        {step === 'paths' && folderId ? (
          <PathsStep
            paths={paths}
            folderId={folderId}
            onChange={(patch) => setPaths((prev) => ({ ...prev, ...patch }))}
            onBrowse={(field, mode) => void browsePath(field, mode)}
          />
        ) : null}

        {error ? <Message type="error">{error}</Message> : null}
      </div>
    </Modal>
  );
};
