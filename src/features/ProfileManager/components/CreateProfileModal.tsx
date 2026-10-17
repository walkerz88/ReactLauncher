import { useState, type FC, type FormEvent } from 'react';

import { useTranslation } from '@/app/i18n';
import { MAX_PROFILE_NAME_LENGTH, useProfileStore } from '@/app/store/profileStore';
import { FormField } from '@/shared/FormField';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/Button';

export interface CreateProfileModalProps {
  onClose: () => void;
}

export const CreateProfileModal: FC<CreateProfileModalProps> = ({ onClose }) => {
  const t = useTranslation();
  const profiles = useProfileStore((state) => state.profiles);
  const createProfile = useProfileStore((state) => state.createProfile);
  const [name, setName] = useState('');
  const [failed, setFailed] = useState(false);

  const trimmedName = name.trim();
  const isTaken = profiles.some((profile) => profile.name.toLowerCase() === trimmedName.toLowerCase());
  const title = t('profile.createTitle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (trimmedName && !isTaken) {
      setFailed(!(await createProfile(trimmedName)));
    }
  };

  const footer = (
    <>
      <Button type="button" onClick={onClose} data-gamepad-focusable>
        {t('profile.cancel')}
      </Button>
      <Button
        type="submit"
        form="create-profile-form"
        variant="accent"
        disabled={!trimmedName || isTaken}
        data-gamepad-focusable
      >
        {t('profile.submit')}
      </Button>
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
      <form id="create-profile-form" className="profile-modal__form" data-id="CreateProfileModal" onSubmit={(event) => void submit(event)}>
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
        {failed ? <Message type="error">{t('profile.createFailed')}</Message> : null}
      </form>
    </Modal>
  );
};
