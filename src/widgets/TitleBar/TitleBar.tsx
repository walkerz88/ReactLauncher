import { useEffect, useState, type FC } from 'react';
import { Minus, Square, X } from 'lucide-react';

import { useFullscreenState } from '@/app/hooks/useFullscreenState';
import { useTranslation } from '@/app/i18n';

import './TitleBar.css';

/**
 * Custom title bar for windowed mode — the window has no OS frame, so this strip
 * is what lets the user drag it and provides minimize/maximize/close controls.
 * Hidden while fullscreen, since there's nothing to drag or restore there.
 */
export const TitleBar: FC = () => {
  const t = useTranslation();
  const isFullscreen = useFullscreenState();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = window.electronAPI?.window;
    if (!api) {
      return;
    }

    const loadInitialState = async () => {
      try {
        setIsMaximized(await api.isMaximized());
      } catch (err) {
        console.error(err);
      }
    };
    void loadInitialState();

    return api.onMaximizedChange(setIsMaximized);
  }, []);

  if (isFullscreen) {
    return null;
  }

  const handleMinimize = () => {
    void window.electronAPI?.window?.minimize();
  };

  const handleToggleMaximize = () => {
    void window.electronAPI?.window?.toggleMaximize();
  };

  const handleClose = () => {
    void window.electronAPI?.window?.close();
  };

  const maximizeLabel = isMaximized ? t('window.restore') : t('window.maximize');

  return (
    <div className="title-bar" data-id="TitleBar">
      <div className="title-bar__controls">
        <button type="button" className="title-bar__btn" onClick={handleMinimize} aria-label={t('window.minimize')}>
          <Minus size={16} />
        </button>
        <button type="button" className="title-bar__btn" onClick={handleToggleMaximize} aria-label={maximizeLabel}>
          <Square size={13} />
        </button>
        <button
          type="button"
          className="title-bar__btn title-bar__btn--close"
          onClick={handleClose}
          aria-label={t('window.close')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
