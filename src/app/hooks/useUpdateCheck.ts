import { useEffect, useRef } from 'react';

import { useTranslation } from '@/app/i18n';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useProfileStore } from '@/app/store/profileStore';
import { useUpdateStore } from '@/app/store/updateStore';

const UPDATE_TOAST_LIFETIME_MS = 15000;

/** Checks for a new version once per launch and shows a toast with Close / Details buttons. Waits for an
 * active profile (none exists until the first one is created). Call once. */
export const useUpdateCheck = (): void => {
  const t = useTranslation();
  const hasActiveProfile = useProfileStore((state) => state.activeId !== null);
  const tRef = useRef(t);
  const checkedRef = useRef(false);

  tRef.current = t;

  useEffect(() => {
    if (!hasActiveProfile || checkedRef.current) {
      return;
    }

    checkedRef.current = true;

    const run = async () => {
      const store = useUpdateStore.getState();
      const status = await store.check();
      const { update, openModal } = useUpdateStore.getState();

      if (status !== 'available' || !update) {
        return;
      }

      useNotificationStore
        .getState()
        .pushNotification(tRef.current('update.available').replace('{version}', update.version), 'update', {
          onClick: openModal,
          lifetimeMs: UPDATE_TOAST_LIFETIME_MS,
        });
    };

    void run();
  }, [hasActiveProfile]);
};
