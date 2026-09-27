type Translate = (key: string) => string;

/** "3 h 12 min" / "45 min" / "under a minute". */
export const formatPlaytime = (seconds: number, t: Translate): string => {
  if (seconds < 60) {
    return t('time.lessThanMinute');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0
    ? `${hours} ${t('time.hoursShort')} ${minutes} ${t('time.minutesShort')}`
    : `${minutes} ${t('time.minutesShort')}`;
};

/** "1д 10ч 45мин" / "10ч 45мин" / "45мин" — the stats page's charts (days only once a day has actually passed,
 * hours only once one has, minutes always). */
export const formatDuration = (seconds: number, t: Translate): string => {
  const totalMinutes = Math.round(seconds / 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}${t('time.daysShort')}`);
  }

  if (days > 0 || hours > 0) {
    parts.push(`${hours}${t('time.hoursShort')}`);
  }

  parts.push(`${minutes}${t('time.minutesShort')}`);

  return parts.join(' ');
};

const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 365 * 24 * 3600 },
  { unit: 'month', seconds: 30 * 24 * 3600 },
  { unit: 'day', seconds: 24 * 3600 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

/** "yesterday", "3 days ago", "just now" — localized with `Intl.RelativeTimeFormat`. */
export const formatRelativeTime = (timestamp: number, locale: string): string => {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const elapsed = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  const match = UNITS.find(({ seconds }) => elapsed >= seconds);

  return match ? formatter.format(-Math.floor(elapsed / match.seconds), match.unit) : formatter.format(0, 'second');
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** "25.12.2026" — the fixed DD.MM.YYYY format used for every date shown in the UI, regardless of locale. */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
};

/** "25.12.2026, 14:32" — the fixed date format above, with a locale-aware time alongside it. */
export const formatDateTime = (timestamp: number, locale: string): string =>
  `${formatDate(timestamp)}, ${new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;

/** "2026-01-05" -> "05.01.2026" — reformats an ISO calendar-day key (`YYYY-MM-DD`) directly, without going
 * through `Date`, which would apply the browser's timezone offset and could shift the day shown. */
export const formatIsoDate = (isoDay: string): string => {
  const [year, month, day] = isoDay.split('-');

  return `${day}.${month}.${year}`;
};

/** "850 KB" / "12.4 MB" / "3.2 GB". */
export const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
