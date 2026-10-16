import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { GENRE_KEYS } from '@/app/lib/genres';
import { FormField } from '@/shared/FormField';
import { MarkdownEditor } from '@/shared/MarkdownEditor';
import { Message } from '@/shared/Message';

import type { BasicsDraft } from '../draft';

import { SteamSearch } from './SteamSearch';

export interface BasicsStepProps {
  basics: BasicsDraft;
  onChange: (patch: Partial<BasicsDraft>) => void;
}

export const BasicsStep: FC<BasicsStepProps> = ({ basics, onChange }) => {
  const t = useTranslation();

  return (
    <div className="add-game__step-body" data-id="BasicsStep">
      <p className="add-game__intro">{t('addGame.basics.intro')}</p>

      <Message type="warning">{t('addGame.basics.nameWarning')}</Message>

      <FormField label={t('editConfig.name')}>
        <input type="text" value={basics.name} onChange={(event) => onChange({ name: event.target.value })} autoFocus />
      </FormField>

      <SteamSearch query={basics.name} steamAppId={basics.steamAppId} onImport={onChange} />

      <div className="add-game__row">
        <FormField label={t('editConfig.genre')}>
          <select value={basics.genre} onChange={(event) => onChange({ genre: event.target.value })}>
            <option value="">{t('editConfig.genreNone')}</option>
            {GENRE_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t('editConfig.series')}>
          <input type="text" value={basics.series} onChange={(event) => onChange({ series: event.target.value })} />
        </FormField>
      </div>

      <FormField label={t('editConfig.rating')}>
        <input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={basics.rating}
          onChange={(event) => onChange({ rating: event.target.value })}
        />
      </FormField>

      <FormField label={t('editConfig.descriptionRu')} plain>
        <MarkdownEditor value={basics.descriptionRu} onChange={(value) => onChange({ descriptionRu: value })} />
      </FormField>

      <FormField label={t('editConfig.descriptionEn')} plain>
        <MarkdownEditor value={basics.descriptionEn} onChange={(value) => onChange({ descriptionEn: value })} />
      </FormField>
    </div>
  );
};
