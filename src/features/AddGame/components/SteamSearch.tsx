import { useState, type FC } from 'react';
import { Search } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { Message } from '@/shared/Message';
import type { SteamSearchResult } from '@/electron';

import type { BasicsDraft } from '../draft';

export interface SteamSearchProps {
  query: string;
  steamAppId: string;
  onImport: (patch: Partial<BasicsDraft>) => void;
}

/** "Fill from Steam": searches the store by the entered title and imports the chosen game's data into the draft. */
export const SteamSearch: FC<SteamSearchProps> = ({ query, steamAppId, onImport }) => {
  const t = useTranslation();

  const [results, setResults] = useState<SteamSearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setBusy(true);
    setError(null);

    try {
      setResults(await window.electronAPI.steam.search(query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addGame.steam.failed'));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (id: string) => {
    setBusy(true);
    setError(null);

    try {
      const info = await window.electronAPI.steam.info(id);

      if (!info) {
        setError(t('addGame.steam.failed'));

        return;
      }

      onImport({
        name: info.name,
        genre: info.genre ?? '',
        rating: info.rating == null ? '' : String(info.rating),
        descriptionRu: info.description.ru ?? '',
        descriptionEn: info.description.en ?? '',
        facts: info.facts,
        steamAppId: info.appId,
      });
      setResults(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addGame.steam.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="add-game__steam" data-id="SteamSearch">
      <button
        type="button"
        className="btn add-game__action"
        disabled={busy || !query.trim()}
        onClick={() => void search()}
        data-gamepad-focusable
      >
        <Search size={16} />
        {busy ? t('addGame.steam.loading') : t('addGame.steam.search')}
      </button>

      {results?.length === 0 ? <Message type="warning">{t('addGame.steam.noResults')}</Message> : null}

      {results && results.length > 0 ? (
        <ul className="add-game__steam-results">
          {results.map(({ id, name }) => (
            <li key={id}>
              <button
                type="button"
                className="add-game__steam-result"
                disabled={busy}
                onClick={() => void pick(id)}
                data-gamepad-focusable
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {steamAppId && !results ? <Message type="success">{t('addGame.steam.imported')}</Message> : null}

      {error ? <Message type="error">{error}</Message> : null}
    </div>
  );
};
