import { ipcMain } from 'electron';

/**
 * Machine translation for the config editor and the library health "translate missing" action — the
 * free, keyless `translate.googleapis.com` endpoint (unofficial, so it can change or rate-limit; a
 * failure just surfaces as `null` and the caller shows an error).
 */

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_CHUNK_LENGTH = 1500;
const TARGET_LANGUAGES = ['ru', 'en'];

/** Splits on line boundaries (Markdown structure survives that) into pieces small enough for one request. */
function toChunks(text: string): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split(/(?<=\n)/)) {
    if (current && current.length + line.length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = '';
    }

    current += line;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function translateChunk(text: string, target: string): Promise<string | null> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: text }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : null;

    if (!segments) {
      return null;
    }

    return segments.map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : '')).join('');
  } catch (err) {
    console.error('[translate] request failed:', err);

    return null;
  }
}

async function translateText(text: string, target: string): Promise<string | null> {
  const parts: string[] = [];

  for (const chunk of toChunks(text)) {
    const translated = await translateChunk(chunk, target);

    if (translated == null) {
      return null;
    }

    parts.push(translated);
  }

  return parts.join('');
}

/** Call once, after `app` is ready. */
export function initTranslate(): void {
  ipcMain.handle('translate:text', async (_event, textRaw: unknown, targetRaw: unknown): Promise<string | null> => {
    if (typeof textRaw !== 'string' || !textRaw.trim() || textRaw.length > MAX_TEXT_LENGTH) {
      return null;
    }

    if (typeof targetRaw !== 'string' || !TARGET_LANGUAGES.includes(targetRaw)) {
      return null;
    }

    return translateText(textRaw, targetRaw);
  });
}
