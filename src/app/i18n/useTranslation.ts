import { useLocaleStore } from '@/app/store/localeStore';

import { messages, type MessageKey } from './messages';

/**
 * `const t = useTranslation();` then `t('nav.home')`. Re-renders on locale change.
 * Accepts any string so keys coming from content `config.json` work too; an
 * unknown key is returned unchanged.
 */
export function useTranslation(): (key: MessageKey | (string & {})) => string {
  const locale = useLocaleStore((state) => state.locale);

  return (key) => {
    const dict = messages[locale] as Record<string, string | undefined>;

    return dict[key] ?? key;
  };
}
