/**
 * Recognises easter eggs typed anywhere in the app: "hello world", the Konami code and the cheat codes of
 * classic games. Keys are read by their physical position (`KeyboardEvent.code`), not by the character they
 * produce, so they are found on any keyboard layout. The last few characters are kept in memory only; nothing
 * is stored or sent except the id of a found secret.
 */

const MAX_BUFFER = 40;

/** Punctuation that may sit between the words of a phrase. */
const SEPARATORS: Record<string, string> = {
  Space: ' ',
  Comma: ',',
  Period: '.',
  Minus: '-',
};

/** Arrows are capitals, so they can't be confused with the lower-case letters of a phrase. */
const ARROWS: Record<string, string> = {
  ArrowUp: 'U',
  ArrowDown: 'D',
  ArrowLeft: 'L',
  ArrowRight: 'R',
};

/** The character a key stands for in a secret (case and Shift don't matter); `null` for keys that aren't part of one. */
const characterOf = (code: string): string | null => {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3).toLowerCase();
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }

  return SEPARATORS[code] ?? ARROWS[code] ?? null;
};

/** Cheat codes of classic games; ids match `SECRET_IDS` in `electron/achievements.ts`. */
const CHEAT_CODES = ['iddqd', 'idkfa', 'idclip', 'hesoyam', 'aezakmi', 'baguvix', 'rosebud', 'motherlode', 'xyzzy', 'noclip'];

const SECRETS: Array<{ id: string; pattern: RegExp }> = [
  // "hello world" with anything from nothing to a few of  , . - _ in between: Hello, World! / helloworld / hello_world
  { id: 'hello-world', pattern: /hello[ ,.-]{0,4}world/ },
  // ↑ ↑ ↓ ↓ ← → ← → B A
  { id: 'konami', pattern: /UUDDLRLRba/ },
  ...CHEAT_CODES.map((code) => ({ id: `cheat-${code}`, pattern: new RegExp(code) })),
];

export interface SecretDetector {
  /** Feed a key press (its `code`); resolves to the id of a secret it just completed, or `null`. */
  feed: (code: string) => string | null;
}

export const createSecretDetector = (): SecretDetector => {
  let buffer = '';

  return {
    feed: (code) => {
      if (code === 'Backspace') {
        buffer = buffer.slice(0, -1);

        return null;
      }

      const character = characterOf(code);

      if (character === null) {
        return null;
      }

      buffer = (buffer + character).slice(-MAX_BUFFER);

      const found = SECRETS.find(({ pattern }) => pattern.test(buffer));

      if (found) {
        buffer = '';

        return found.id;
      }

      return null;
    },
  };
};
