/**
 * Recognises easter eggs typed anywhere in the app: phrases, cheat codes, the Konami code. Keys are read by
 * their physical position (`KeyboardEvent.code`), not by the character they produce, so they are found on any
 * keyboard layout. The last few characters are kept in memory only; nothing is stored or sent except the id
 * of a found secret.
 *
 * The Russian-culture phrases (`cheburashka`, `vzhukh`, `sila-v-pravde`, `nu-pogodi`, `tetris`, `vodka`,
 * `medved`, `balalaika`) additionally
 * accept the actual Cyrillic text ("чебурашка" etc.), not just its Latin transliteration — either spelling
 * grants the same id. That needs the *produced character* (`KeyboardEvent.key`), not the physical position:
 * a Cyrillic layout doesn't map physical keys phonetically, so there is no `code`-based way to detect it. This
 * runs as a second, parallel buffer/matcher (`cyrillicBuffer`/`CYRILLIC_SECRETS`) — layout independence is
 * pointless for literal Cyrillic text anyway, since typing it already requires a Cyrillic layout.
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
  // tolerates the common "cheburaska" slip (dropped h in -sh-)
  { id: 'cheburashka', pattern: /cheburash?ka/ },
  { id: 'vzhukh', pattern: /vzhuh|vzhukh/ },
  // tolerates the doubled-d "skibiddi" typo
  { id: 'skibidi', pattern: /skibid+i/ },
  // "sila" is optional — "v pravde" alone directly answers the movie's question ("v chyom sila?"),
  // and "pravda" (nominative) is accepted alongside the movie's actual "pravde" (dative)
  { id: 'sila-v-pravde', pattern: /(sila ?)?v ?pravd[ae]/ },
  { id: 'nu-pogodi', pattern: /nu[ ,]?pogodi/ },
  { id: 'tetris', pattern: /tetris/ },
  { id: 'vodka', pattern: /vodka/ },
  { id: 'medved', pattern: /medved/ },
  { id: 'balalaika', pattern: /balalaika/ },
  // "there's" (apostrophe is simply dropped by characterOf, so it reads as "theres") as well as "there is"
  { id: 'no-spoon', pattern: /there(s| ?is) ?no ?spoon/ },
  // the hard part to spell ("wingardium") is optional — the memorable, phonetic "leviosa" is enough on its own,
  // and what little of "wingardium" is required tolerates a couple of dropped letters
  { id: 'wingardium', pattern: /(wing?ard?ium ?)?leviosa/ },
  { id: 'hakuna-matata', pattern: /hakuna ?matata/ },
  // "my dear" is easy to forget or garble — "elementary, watson" alone still counts
  { id: 'elementary', pattern: /elementary,? ?(my ?dear ?)?watson/ },
  // "and" is optional — "to infinity beyond" still counts
  { id: 'to-infinity', pattern: /to ?infinity ?(and ?)?beyond/ },
  ...CHEAT_CODES.map((code) => ({ id: `cheat-${code}`, pattern: new RegExp(code) })),
];

/** Same ids as their Latin counterparts above — the actual Cyrillic spelling grants the same achievement. */
const CYRILLIC_SECRETS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'cheburashka', pattern: /чебурашка/ },
  { id: 'vzhukh', pattern: /вж+ух/ },
  { id: 'sila-v-pravde', pattern: /(сила ?)?в ?правд[ае]/ },
  { id: 'nu-pogodi', pattern: /ну[ ,]?погоди/ },
  { id: 'tetris', pattern: /тетрис/ },
  { id: 'vodka', pattern: /водка/ },
  { id: 'medved', pattern: /медведь/ },
  { id: 'balalaika', pattern: /балалайка/ },
];

/** The Cyrillic letter (lower-cased) a key produces, or a separator; `null` for anything else. */
const cyrillicCharacterOf = (key: string): string | null => {
  if (/^[а-яё]$/i.test(key)) {
    return key.toLowerCase();
  }

  return key === ' ' || key === ',' || key === '.' || key === '-' ? key : null;
};

export interface SecretDetector {
  /** Feed a key press (`code` for the layout-independent Latin secrets, `key` for the Cyrillic ones);
   * resolves to the id of a secret it just completed, or `null`. */
  feed: (code: string, key: string) => string | null;
}

export const createSecretDetector = (): SecretDetector => {
  let buffer = '';
  let cyrillicBuffer = '';

  return {
    feed: (code, key) => {
      if (code === 'Backspace') {
        buffer = buffer.slice(0, -1);
        cyrillicBuffer = cyrillicBuffer.slice(0, -1);

        return null;
      }

      const character = characterOf(code);

      if (character !== null) {
        buffer = (buffer + character).slice(-MAX_BUFFER);

        const found = SECRETS.find(({ pattern }) => pattern.test(buffer));

        if (found) {
          buffer = '';

          return found.id;
        }
      }

      const cyrillicCharacter = cyrillicCharacterOf(key);

      if (cyrillicCharacter !== null) {
        cyrillicBuffer = (cyrillicBuffer + cyrillicCharacter).slice(-MAX_BUFFER);

        const found = CYRILLIC_SECRETS.find(({ pattern }) => pattern.test(cyrillicBuffer));

        if (found) {
          cyrillicBuffer = '';

          return found.id;
        }
      }

      return null;
    },
  };
};
