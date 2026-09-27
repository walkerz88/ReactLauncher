import { useEffect, useState } from 'react';

/** Tracks the window's fullscreen state (also reacts to F11 / OS-driven toggles). */
export const useFullscreenState = (): boolean => {
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    const api = window.electronAPI?.window;
    if (!api) {
      return;
    }

    const loadInitialState = async () => {
      try {
        setIsFullscreen(await api.isFullscreen());
      } catch (err) {
        console.error(err);
      }
    };
    void loadInitialState();

    return api.onFullscreenChange(setIsFullscreen);
  }, []);

  return isFullscreen;
};
