import { useEffect } from 'react';

import { createSecretDetector } from '@/app/lib/typedSecrets';

/** Watches typing everywhere in the app for easter-egg phrases and reports a found one. Call once. */
export const useTypedSecrets = (): void => {
  useEffect(() => {
    const progress = window.electronAPI?.progress;

    if (!progress) {
      return undefined;
    }

    const detector = createSecretDetector();

    const report = async (id: string) => {
      try {
        await progress.event('secret', id);
      } catch (err) {
        console.error('Reporting progress failed:', err);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const found = detector.feed(event.code, event.key);

      if (found) {
        void report(found);
      }
    };

    // Capture phase, and never preventDefault: typing must behave exactly as if nobody was listening.
    document.addEventListener('keydown', onKeyDown, { capture: true });

    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, []);
};
