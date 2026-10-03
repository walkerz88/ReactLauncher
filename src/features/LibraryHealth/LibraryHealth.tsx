import { useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Languages, Loader2, Wand2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { getFieldStatus, getHealthIssues, HEALTH_FIELD_COLUMNS } from '@/app/lib/libraryHealth';
import { fillMissingTranslations } from '@/app/lib/translateMissing';
import { useContentStore } from '@/app/store/contentStore';
import type { RawAppConfig, SteamSearchResult } from '@/electron';
import { BulkFillModal, type FillFields } from '@/shared/BulkFillModal';
import { SteamNoMatchModal } from '@/shared/SteamNoMatchModal';
import { SteamPickerModal } from '@/shared/SteamPickerModal';
import { TristateCheckbox } from '@/shared/TristateCheckbox';

import { FieldStatusIcon } from './components/FieldStatusIcon';
import { LibrarySizes } from './components/LibrarySizes';

import './LibraryHealth.css';

type FillStatus = 'searching' | 'updating' | 'translating' | 'done' | 'nothing' | 'noMatch' | 'failed';

/** Every game with a missing cover/trailer, as a table — so fixing the library doesn't mean hunting
 * problem cards one by one across the whole gallery. Checking a game and confirming the popup re-fetches
 * exactly the fields picked there from Steam, for every checked game — assets are downloaded, and
 * description/facts/genre/rating are merged into the existing config.json without touching anything else. */
export const LibraryHealth: FC = () => {
  const t = useTranslation();
  const apps = useContentStore((state) => state.apps);
  const loadApps = useContentStore((state) => state.loadApps);
  const [fillStatus, setFillStatus] = useState<Record<string, FillStatus>>({});
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [picker, setPicker] = useState<{ appName: string; results: SteamSearchResult[] } | null>(null);
  const pickResolverRef = useRef<((id: string | null) => void) | null>(null);
  const [noMatchPopup, setNoMatchPopup] = useState<{ name: string } | null>(null);
  const noMatchResolverRef = useRef<((action: { retry: true; name: string } | { retry: false }) => void) | null>(null);

  const rows = apps.map((app) => ({ app, issues: getHealthIssues(app) })).filter((row) => row.issues.length > 0);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((row) => row.app.id)) : new Set());
  };

  /** Pauses the bulk loop below to let the user pick the right game for one entry that Steam search
   * didn't confidently match by name — resolves to the chosen app id, or `null` if they cancel (that
   * entry is then left as `noMatch`, same as if search had found nothing at all). */
  const pickSteamResult = (appName: string, results: SteamSearchResult[]): Promise<string | null> =>
    new Promise((resolve) => {
      pickResolverRef.current = resolve;
      setPicker({ appName, results });
    });

  const resolvePicker = (id: string | null) => {
    pickResolverRef.current?.(id);
    pickResolverRef.current = null;
    setPicker(null);
  };

  /** Pauses the bulk loop when Steam search finds nothing at all for the current name — lets the user
   * retype it and retry, or give up on this one entry and move on. */
  const promptNoMatch = (name: string): Promise<{ retry: true; name: string } | { retry: false }> =>
    new Promise((resolve) => {
      noMatchResolverRef.current = resolve;
      setNoMatchPopup({ name });
    });

  const resolveNoMatchContinue = (name: string) => {
    noMatchResolverRef.current?.({ retry: true, name });
    noMatchResolverRef.current = null;
    setNoMatchPopup(null);
  };

  const resolveNoMatchSkip = () => {
    noMatchResolverRef.current?.({ retry: false });
    noMatchResolverRef.current = null;
    setNoMatchPopup(null);
  };

  /** Searches Steam for one game, looping the "no matches" retry popup until either a search returns
   * results (handed to the match picker) or the user skips — resolves to the chosen app id, or `null`. */
  const findSteamMatch = async (initialName: string): Promise<string | null> => {
    const steamApi = window.electronAPI?.steam;
    if (!steamApi) {
      return null;
    }

    let name = initialName;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const results = await steamApi.search(name);

      if (results.length > 0) {
        return pickSteamResult(name, results);
      }

      const action = await promptNoMatch(name);
      if (!action.retry) {
        return null;
      }

      name = action.name;
    }
  };

  const handleConfirm = async (fields: FillFields) => {
    const steamApi = window.electronAPI?.steam;
    const contentApi = window.electronAPI?.content;
    const targets = rows.filter((row) => selected.has(row.app.id)).map((row) => row.app);

    setModalOpen(false);

    if (running || targets.length === 0 || !steamApi || !contentApi) {
      return;
    }

    const wantsAssets = fields.coverHorizontal || fields.coverVertical || fields.trailer || fields.screenshots;
    const wantsConfig = fields.description || fields.facts || fields.genre || fields.rating;

    setRunning(true);
    setFillStatus({});

    for (const app of targets) {
      setFillStatus((current) => ({ ...current, [app.id]: 'searching' }));

      try {
        const matchId = await findSteamMatch(app.name);

        if (!matchId) {
          setFillStatus((current) => ({ ...current, [app.id]: 'noMatch' }));
          continue;
        }

        setFillStatus((current) => ({ ...current, [app.id]: 'updating' }));

        let ok = true;

        if (wantsAssets) {
          const result = await contentApi.downloadSteamAssets(app.id, matchId, {
            horizontal: fields.coverHorizontal,
            vertical: fields.coverVertical,
            trailer: fields.trailer,
            screenshots: fields.screenshots,
          });
          ok = ok && result != null;
        }

        if (wantsConfig) {
          const info = await steamApi.info(matchId);

          if (info) {
            const current = await contentApi.readConfig(app.id);
            const config: RawAppConfig = { ...(current?.config ?? {}) };

            if (fields.description) {
              config.description = { ru: info.description.ru ?? undefined, en: info.description.en ?? undefined };
            }
            if (fields.facts) {
              config.facts = info.facts;
            }
            if (fields.genre && info.genre) {
              config.genre = info.genre;
            }
            if (fields.rating && info.rating != null) {
              config.rating = info.rating;
            }

            const writeResult = await contentApi.writeConfig(app.id, config);
            ok = ok && Boolean(writeResult?.ok);
          } else {
            ok = false;
          }
        }

        setFillStatus((current) => ({ ...current, [app.id]: ok ? 'done' : 'failed' }));
      } catch (err) {
        console.error('Bulk library update failed for', app.id, err);
        setFillStatus((current) => ({ ...current, [app.id]: 'failed' }));
      }
    }

    setRunning(false);
    setSelected(new Set());

    try {
      await loadApps();
    } catch (err) {
      console.error('Reloading the library after a bulk update failed:', err);
    }
  };

  /** Fills the missing language of every selected game's description, instructions and notes by machine
   * translation — only ever into an empty field, so nothing already written is overwritten. */
  const handleTranslateMissing = async () => {
    const contentApi = window.electronAPI?.content;
    const targets = rows.filter((row) => selected.has(row.app.id)).map((row) => row.app);

    if (running || targets.length === 0 || !contentApi) {
      return;
    }

    setRunning(true);
    setFillStatus({});

    for (const app of targets) {
      setFillStatus((current) => ({ ...current, [app.id]: 'translating' }));

      try {
        const current = await contentApi.readConfig(app.id);
        const { config, changed, failed } = await fillMissingTranslations(current?.config ?? {});
        let ok = !failed;

        if (changed) {
          const writeResult = await contentApi.writeConfig(app.id, config);
          ok = ok && Boolean(writeResult?.ok);
        }

        setFillStatus((state) => ({ ...state, [app.id]: !ok ? 'failed' : changed ? 'done' : 'nothing' }));
      } catch (err) {
        console.error('Translating missing texts failed for', app.id, err);
        setFillStatus((state) => ({ ...state, [app.id]: 'failed' }));
      }
    }

    setRunning(false);
    setSelected(new Set());

    try {
      await loadApps();
    } catch (err) {
      console.error('Reloading the library after translating failed:', err);
    }
  };

  const allSelected = selected.size > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div data-id="LibraryHealth">
      {rows.length === 0 ? (
        <p className="home-hint">{t('health.allGood')}</p>
      ) : (
        <>
          <p className="library-health__summary">
            {t('health.summary').replace('{count}', String(rows.length)).replace('{total}', String(apps.length))}
          </p>

          <table className="library-health__table">
            <thead>
              <tr>
                <th className="library-health__col-checkbox">
                  <TristateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    ariaLabel={t('health.selectAll')}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="library-health__col-cover">{t('health.columnImage')}</th>
                <th>{t('health.columnName')}</th>
                {HEALTH_FIELD_COLUMNS.map((column) => (
                  <th key={column.labelKey} className="library-health__col-status">
                    {t(column.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map(({ app, issues }) => {
                const cover = app.coverVertical ?? app.coverHorizontal;
                const status = fillStatus[app.id];

                return (
                  <tr key={app.id} className="library-health__row">
                    <td className="library-health__col-checkbox">
                      <input
                        type="checkbox"
                        className="library-health__checkbox"
                        checked={selected.has(app.id)}
                        onChange={(event) => toggleSelected(app.id, event.target.checked)}
                        aria-label={app.name}
                        data-gamepad-focusable
                      />
                    </td>

                    <td className="library-health__col-cover">
                      <span className="library-health__cover">
                        {cover ? (
                          <img src={cover} alt="" draggable={false} />
                        ) : (
                          <span className="library-health__cover-fallback">{app.name.charAt(0)}</span>
                        )}
                      </span>
                    </td>

                    <td className="library-health__name">
                      <Link className="library-health__name-link" to={`/app/${encodeURIComponent(app.id)}`}>
                        {app.name}
                      </Link>
                      {status ? <span className="library-health__tag library-health__tag--status">{t(`health.fill.${status}`)}</span> : null}
                    </td>

                    {HEALTH_FIELD_COLUMNS.map((column) => {
                      const { status: fieldStatus, issue } = getFieldStatus(app, issues, column);
                      const label = issue
                        ? t(`health.${issue}`)
                        : fieldStatus === 'none'
                          ? t('health.fieldEmpty')
                          : t('health.fieldOk');

                      return (
                        <td key={column.labelKey} className="library-health__col-status">
                          <FieldStatusIcon status={fieldStatus} label={label} />
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <LibrarySizes apps={apps} />

      {selected.size > 0 ? (
        <div className="library-health__action-bar-anchor">
          <div className="library-health__action-bar">
            <span className="library-health__action-count">
              {t('health.selectedCount').replace('{count}', String(selected.size))}
            </span>
            <button
              type="button"
              className="btn btn--accent btn--small"
              onClick={() => setModalOpen(true)}
              disabled={running}
              data-gamepad-focusable
            >
              {running ? <Loader2 size={14} className="library-health__spin" /> : <Wand2 size={14} />}
              {t('health.fillSelected')}
            </button>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => void handleTranslateMissing()}
              disabled={running}
              data-gamepad-focusable
            >
              <Languages size={14} />
              {t('health.translateMissing')}
            </button>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <BulkFillModal count={selected.size} onClose={() => setModalOpen(false)} onConfirm={(fields) => void handleConfirm(fields)} />
      ) : null}

      {picker ? (
        <SteamPickerModal
          results={picker.results}
          busy={false}
          title={t('steamPicker.titleFor').replace('{name}', picker.appName)}
          onPick={(id) => resolvePicker(id)}
          onClose={() => resolvePicker(null)}
        />
      ) : null}

      {noMatchPopup ? (
        <SteamNoMatchModal
          initialName={noMatchPopup.name}
          busy={false}
          onContinue={(name) => resolveNoMatchContinue(name)}
          onSkip={resolveNoMatchSkip}
          onClose={resolveNoMatchSkip}
        />
      ) : null}
    </div>
  );
};
