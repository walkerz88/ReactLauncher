import type { FC } from 'react';

import { useLocaleStore } from '@/app/store/localeStore';
import { LOCALES, useTranslation, type Locale } from '@/app/i18n';
import { ToggleGroup, type ToggleGroupOption } from '@/shared/ToggleGroup';

/** Language names are always shown in their own language. */
const LABELS: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

export const LanguageToggle: FC = () => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const options: ToggleGroupOption<Locale>[] = LOCALES.map((value) => ({
    value,
    label: LABELS[value],
  }));

  return <ToggleGroup options={options} value={locale} onChange={setLocale} ariaLabel={t('language.groupLabel')} />;
};
