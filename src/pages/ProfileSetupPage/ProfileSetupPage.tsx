import { useState, type FC, type FormEvent } from 'react';

import { useTranslation } from '@/app/i18n';
import { MAX_PROFILE_NAME_LENGTH, useProfileStore } from '@/app/store/profileStore';
import { Message } from '@/shared/Message';

import './ProfileSetupPage.css';

/** Shown instead of the app while no profile exists (first launch, or after the last profile was deleted). */
export const ProfileSetupPage: FC = () => {
  const t = useTranslation();
  const createProfile = useProfileStore((state) => state.createProfile);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  const trimmedName = name.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!trimmedName || isCreating) {
      return;
    }

    setIsCreating(true);
    setFailed(!(await createProfile(trimmedName)));
    setIsCreating(false);
  };

  return (
    <form className="profile-setup" data-id="ProfileSetupPage" onSubmit={(event) => void submit(event)}>
      <h1 className="profile-setup__title">{t('profile.setupPrompt')}</h1>

      <input
        type="text"
        className="profile-setup__input"
        value={name}
        maxLength={MAX_PROFILE_NAME_LENGTH}
        aria-label={t('profile.name')}
        autoComplete="off"
        spellCheck={false}
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />

      <button
        type="submit"
        className="btn btn--accent profile-setup__submit"
        disabled={!trimmedName || isCreating}
        data-gamepad-focusable
      >
        {t('profile.submit')}
      </button>

      {failed ? <Message type="error">{t('profile.createFailed')}</Message> : null}
    </form>
  );
};
