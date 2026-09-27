import { useState, type FC } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useProfileStore, type Profile } from '@/app/store/profileStore';
import { ConfirmModal } from '@/shared/ConfirmModal';

import { CreateProfileModal } from './components/CreateProfileModal';
import { RenameProfileModal } from './components/RenameProfileModal';

import './ProfileManager.css';

export const ProfileManager: FC = () => {
  const t = useTranslation();
  const profiles = useProfileStore((state) => state.profiles);
  const activeId = useProfileStore((state) => state.activeId);
  const switchProfile = useProfileStore((state) => state.switchProfile);
  const deleteProfile = useProfileStore((state) => state.deleteProfile);
  const [isCreating, setIsCreating] = useState(false);
  const [profileToRename, setProfileToRename] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const confirmDelete = () => {
    if (profileToDelete) {
      void deleteProfile(profileToDelete.id);
    }

    setProfileToDelete(null);
  };

  return (
    <div data-id="ProfileManager">
      <p className="profile-manager__hint">{t('profile.switchHint')}</p>

      <ul className="profile-manager">
        {profiles.map((profile) => (
          <li key={profile.id} className="profile-manager__item">
            <button
              type="button"
              className="profile-manager__card"
              role="radio"
              aria-checked={profile.id === activeId}
              onClick={() => void switchProfile(profile.id)}
              data-gamepad-focusable
            >
              <span className="profile-manager__avatar">{profile.name.charAt(0).toUpperCase()}</span>
              <span className="profile-manager__text">
                <span className="profile-manager__name">{profile.name}</span>
                {profile.id === activeId ? (
                  <span className="profile-manager__badge">{t('profile.active')}</span>
                ) : null}
              </span>
            </button>

            <button
              type="button"
              className="profile-manager__rename"
              aria-label={t('profile.rename')}
              onClick={() => setProfileToRename(profile)}
              data-gamepad-focusable
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              className="profile-manager__delete"
              aria-label={t('profile.delete')}
              onClick={() => setProfileToDelete(profile)}
              data-gamepad-focusable
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}

        <li className="profile-manager__item">
          <button
            type="button"
            className="profile-manager__card profile-manager__card--add"
            onClick={() => setIsCreating(true)}
            data-gamepad-focusable
          >
            <Plus size={16} />
            <span className="profile-manager__name">{t('profile.create')}</span>
          </button>
        </li>
      </ul>

      {isCreating ? <CreateProfileModal onClose={() => setIsCreating(false)} /> : null}

      {profileToRename ? (
        <RenameProfileModal profile={profileToRename} onClose={() => setProfileToRename(null)} />
      ) : null}

      {profileToDelete ? (
        <ConfirmModal
          title={t('profile.delete')}
          message={t('profile.deleteConfirm').replace('{name}', profileToDelete.name)}
          confirmLabel={t('profile.delete')}
          cancelLabel={t('profile.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setProfileToDelete(null)}
        />
      ) : null}
    </div>
  );
};
