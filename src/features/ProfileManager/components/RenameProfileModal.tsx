import { useState, type FC, type FormEvent } from 'react';

import { useTranslation } from '@/app/i18n';
import { MAX_PROFILE_NAME_LENGTH, useProfileStore, type Profile } from '@/app/store/profileStore';
import { FormField } from '@/shared/FormField';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';

export interface RenameProfileModalProps {
  profile: Profile;
  onClose: () => void;
}

export const RenameProfileModal: FC<RenameProfileModalProps> = ({ profile, onClose }) => {
  const t = useTranslation();
  const profiles = useProfileStore((state) => state.profiles);
  const renameProfile = useProfileStore((state) => state.renameProfile);
  const [name, setName] = useState(profile.name);

  const trimmedName = name.trim();
  const isTaken = profiles.some(
    (entry) => entry.id !== profile.id && entry.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  const title = t('profile.renameTitle');

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (trimmedName && !isTaken) {
      void renameProfile(profile.id, trimmedName);
      onClose();
    }
  };

  const footer = (
    <>
      <button type="button" className="btn" onClick={onClose} data-gamepad-focusable>
        {t('profile.cancel')}
      </button>
      <button
        type="submit"
        form="rename-profile-form"
        className="btn btn--accent"
        disabled={!trimmedName || isTaken}
        data-gamepad-focusable
      >
        {t('profile.rename')}
      </button>
    </>
  );

  return (
    <Modal
      title={title}
      ariaLabel={title}
      onClose={onClose}
      className="profile-modal"
      footer={footer}
      closeOnOverlayClick={false}
    >
      <form id="rename-profile-form" className="profile-modal__form" data-id="RenameProfileModal" onSubmit={submit}>
        <FormField label={t('profile.name')}>
          <input
            type="text"
            value={name}
            maxLength={MAX_PROFILE_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </FormField>

        {isTaken ? <Message type="warning">{t('profile.nameTaken')}</Message> : null}
      </form>
    </Modal>
  );
};
