import type { ContentApp, ProgressEventKind } from '@/electron';

/** Tells the main process about something only the window can see; it checks the claim itself. Never throws. */
export const reportProgress = async (kind: ProgressEventKind, id: string): Promise<void> => {
  try {
    await window.electronAPI?.progress?.event(kind, id);
  } catch (err) {
    console.error('Reporting progress failed:', err);
  }
};

const releaseYear = (app: ContentApp): number | null => {
  const fact = app.facts.find((entry) => entry.label.en === 'Release year' || entry.label.ru === 'Год выхода');
  const match = /\b(?:19|20)\d{2}\b/.exec(fact?.value.en ?? fact?.value.ru ?? '');

  return match ? Number(match[0]) : null;
};

/** What launching `app` says about the library: its genre, a rating extreme, a retro title, a finished series. */
export const launchFactEvents = (
  app: ContentApp,
  library: ContentApp[],
  launchedIds: ReadonlySet<string>,
): Array<[ProgressEventKind, string]> => {
  const events: Array<[ProgressEventKind, string]> = [];

  if (app.genre) {
    events.push(['genre', app.genre]);
  }

  if (app.rating !== null && app.rating < 7) {
    events.push(['feature', 'low-rated']);
  }

  if (app.rating !== null && app.rating >= 9) {
    events.push(['feature', 'high-rated']);
  }

  const year = releaseYear(app);

  if (year !== null && year < 2000) {
    events.push(['feature', 'retro']);
  }

  if (!app.coverHorizontal && !app.coverVertical) {
    events.push(['feature', 'no-cover']);
  }

  // % of the current library ever launched — re-evaluated against today's library size on every
  // launch, so it tracks what you've actually covered right now rather than a snapshot from when
  // you first crossed a threshold. Once granted, an achievement stays granted even if the library
  // grows afterwards and the percentage dips back below the threshold.
  if (library.length > 0) {
    const launchedCount = launchedIds.has(app.id) ? launchedIds.size : launchedIds.size + 1;
    const percent = (launchedCount / library.length) * 100;

    if (percent >= 25) {
      events.push(['feature', 'library-25']);
    }

    if (percent >= 50) {
      events.push(['feature', 'library-50']);
    }

    if (percent >= 75) {
      events.push(['feature', 'library-75']);
    }

    if (percent >= 100) {
      events.push(['feature', 'library-100']);
    }
  }

  if (app.series) {
    const members = library.filter((entry) => entry.series === app.series);

    if (members.length >= 3 && members.every((entry) => launchedIds.has(entry.id))) {
      events.push(['series', app.series]);
    }
  }

  return events;
};
