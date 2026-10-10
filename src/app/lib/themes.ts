export type ThemeMode = 'dark' | 'light';

/** The four colors a theme is defined by; every other token is derived from them. */
export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  accent: string;
}

/** Extra animation/effect set a unique theme brings on top of its colors (see `widgets/ThemeEffects`). */
export type ThemeEffect =
  | 'cyberpunk'
  | 'anime-night'
  | 'winter'
  | 'autumn'
  | 'matrix'
  | 'aurora'
  | 'nebula'
  | 'ocean'
  | 'embers'
  | 'fireflies'
  | 'sakura'
  | 'frost'
  | 'sunrise'
  | 'lavender';

export interface ThemeDefinition {
  id: string;
  name: string;
  /** Picks the base token set (semantic colors, `color-scheme`) the theme builds on. */
  mode: ThemeMode;
  colors: ThemeColors;
  effect?: ThemeEffect;
}

export const COLOR_FIELDS = ['bg', 'surface', 'text', 'accent'] as const satisfies ReadonlyArray<keyof ThemeColors>;

export const MAX_THEME_NAME_LENGTH = 30;

export const CUSTOM_THEME_ID_PREFIX = 'custom-';

/** `dark` and `light` are styled by the `[data-theme]` blocks in `global.css`; the rest are applied as inline tokens. */
export const STYLESHEET_THEME_IDS: readonly string[] = ['dark', 'light'];

export const PRESET_THEMES: ThemeDefinition[] = [
  { id: 'dark', name: 'Dark', mode: 'dark', colors: { bg: '#15181c', surface: '#1f2329', text: '#e6eaf0', accent: '#5a9aff' } },
  { id: 'light', name: 'Light', mode: 'light', colors: { bg: '#f4f5f7', surface: '#ffffff', text: '#1c2024', accent: '#2563eb' } },
  { id: 'amoled', name: 'Amoled', mode: 'dark', colors: { bg: '#000000', surface: '#0e0e10', text: '#f2f2f2', accent: '#4cc2ff' } },
  { id: 'midnight', name: 'Midnight', mode: 'dark', colors: { bg: '#0b1226', surface: '#131c38', text: '#dbe4ff', accent: '#4fd1c5' } },
  { id: 'dracula', name: 'Dracula', mode: 'dark', colors: { bg: '#282a36', surface: '#343746', text: '#f8f8f2', accent: '#bd93f9' } },
  { id: 'nord', name: 'Nord', mode: 'dark', colors: { bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0' } },
  { id: 'forest', name: 'Forest', mode: 'dark', colors: { bg: '#0f1a14', surface: '#16261d', text: '#dcefe3', accent: '#4ade80' } },
  { id: 'crimson', name: 'Crimson', mode: 'dark', colors: { bg: '#140b0d', surface: '#221317', text: '#f3e4e6', accent: '#f43f5e' } },
  { id: 'cyberpunk', name: 'Cyberpunk', mode: 'dark', colors: { bg: '#0d0221', surface: '#1a0b3b', text: '#f0e6ff', accent: '#ff2a6d' } },
];

/** Themes that differ from the presets not only in colors but in animation and effects. */
export const UNIQUE_THEMES: ThemeDefinition[] = [
  {
    id: 'unique-cyberpunk',
    name: 'Cyberpunk',
    mode: 'dark',
    colors: { bg: '#05010d', surface: '#120826', text: '#d9f9ff', accent: '#00f0ff' },
    effect: 'cyberpunk',
  },
  {
    id: 'unique-anime-night',
    name: 'Anime Night',
    mode: 'dark',
    colors: { bg: '#120d26', surface: '#201a3d', text: '#f1e9ff', accent: '#ff7eb6' },
    effect: 'anime-night',
  },
  {
    id: 'unique-winter',
    name: 'Winter',
    mode: 'dark',
    colors: { bg: '#0a1626', surface: '#13243b', text: '#e6f2ff', accent: '#7cc7ff' },
    effect: 'winter',
  },
  {
    id: 'unique-autumn',
    name: 'Autumn',
    mode: 'dark',
    colors: { bg: '#1d120b', surface: '#2c1b10', text: '#f6e6d3', accent: '#ff8c3a' },
    effect: 'autumn',
  },
  {
    id: 'unique-matrix',
    name: 'Matrix',
    mode: 'dark',
    colors: { bg: '#020a04', surface: '#07140b', text: '#c8ffd8', accent: '#00ff66' },
    effect: 'matrix',
  },
  {
    id: 'unique-aurora',
    name: 'Aurora',
    mode: 'dark',
    colors: { bg: '#050d1c', surface: '#0d1a30', text: '#e4fff5', accent: '#4dffc3' },
    effect: 'aurora',
  },
  {
    id: 'unique-nebula',
    name: 'Nebula',
    mode: 'dark',
    colors: { bg: '#07040f', surface: '#150d26', text: '#efe6ff', accent: '#b57bff' },
    effect: 'nebula',
  },
  {
    id: 'unique-ocean',
    name: 'Ocean',
    mode: 'dark',
    colors: { bg: '#031a26', surface: '#0a2c3d', text: '#d9f7ff', accent: '#3ad0e8' },
    effect: 'ocean',
  },
  {
    id: 'unique-embers',
    name: 'Embers',
    mode: 'dark',
    colors: { bg: '#12090a', surface: '#22110f', text: '#ffe9dc', accent: '#ff6a2b' },
    effect: 'embers',
  },
  {
    id: 'unique-fireflies',
    name: 'Fireflies',
    mode: 'dark',
    colors: { bg: '#06100d', surface: '#0f1f19', text: '#e3f5c8', accent: '#c4f542' },
    effect: 'fireflies',
  },
  {
    id: 'unique-sakura',
    name: 'Sakura',
    mode: 'light',
    colors: { bg: '#fff1f5', surface: '#ffffff', text: '#3a1f2b', accent: '#c2255c' },
    effect: 'sakura',
  },
  {
    id: 'unique-frost',
    name: 'Frost',
    mode: 'light',
    colors: { bg: '#eef6ff', surface: '#ffffff', text: '#12263a', accent: '#1f6fcf' },
    effect: 'frost',
  },
  {
    id: 'unique-sunrise',
    name: 'Sunrise',
    mode: 'light',
    colors: { bg: '#fff6e8', surface: '#ffffff', text: '#3b2a14', accent: '#b34a06' },
    effect: 'sunrise',
  },
  {
    id: 'unique-lavender',
    name: 'Lavender',
    mode: 'light',
    colors: { bg: '#f4efff', surface: '#ffffff', text: '#2a1f45', accent: '#6a3df0' },
    effect: 'lavender',
  },
];

export const DEFAULT_THEME_ID = 'dark';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_PATTERN.test(value);

type Rgb = [number, number, number];

const parseHex = (hex: string): Rgb => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;

/** `amount` of `to` blended into `from`, 0..1. */
const mix = (from: string, to: string, amount: number): string => {
  const a = parseHex(from);
  const b = parseHex(to);

  return toHex(a.map((channel, index) => channel + (b[index] - channel) * amount) as Rgb);
};

const alpha = (hex: string, opacity: number): string => {
  const [r, g, b] = parseHex(hex);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const luminance = (hex: string): number => {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const value = channel / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const DARK_TEXT = '#0b1220';

/** Dark or white text, whichever contrasts more with the given background. */
const readableTextOn = (background: string): string => {
  const level = luminance(background);
  const againstDark = (level + 0.05) / (luminance(DARK_TEXT) + 0.05);
  const againstWhite = 1.05 / (level + 0.05);

  return againstDark > againstWhite ? DARK_TEXT : '#ffffff';
};

const SEMANTIC_COLORS: Record<ThemeMode, { danger: string; warning: string; success: string; subtle: number }> = {
  dark: { danger: '#e0736b', warning: '#e0b34a', success: '#5cc292', subtle: 0.14 },
  light: { danger: '#dc2626', warning: '#b45309', success: '#15803d', subtle: 0.1 },
};

/** Every CSS custom property a theme sets, derived from its four base colors. */
export const buildThemeVars = ({ mode, colors }: ThemeDefinition): Record<string, string> => {
  const { bg, surface, text, accent } = colors;
  const semantic = SEMANTIC_COLORS[mode];
  const isDark = mode === 'dark';

  const top = isDark ? mix(bg, '#ffffff', 0.04) : mix(bg, '#ffffff', 0.6);
  const bottom = isDark ? mix(bg, '#000000', 0.25) : mix(bg, '#000000', 0.04);

  return {
    '--color-bg': bg,
    '--color-surface': surface,
    '--color-surface-hover': alpha(text, isDark ? 0.08 : 0.05),
    '--color-border': alpha(text, isDark ? 0.07 : 0.09),
    '--color-text': text,
    '--color-text-muted': mix(text, bg, 0.36),
    '--color-accent': accent,
    '--color-accent-subtle': alpha(accent, isDark ? 0.16 : 0.12),
    '--color-accent-text': readableTextOn(accent),
    '--color-danger': semantic.danger,
    '--color-danger-subtle': alpha(semantic.danger, semantic.subtle),
    '--color-warning': semantic.warning,
    '--color-warning-subtle': alpha(semantic.warning, semantic.subtle),
    '--color-success': semantic.success,
    '--color-success-subtle': alpha(semantic.success, semantic.subtle),
    '--color-info': accent,
    '--color-info-subtle': alpha(accent, semantic.subtle),
    '--gradient-app': [
      `radial-gradient(1100px 620px at 12% -8%, ${alpha(accent, isDark ? 0.14 : 0.1)}, transparent 60%)`,
      `radial-gradient(900px 640px at 108% 4%, ${alpha(accent, isDark ? 0.08 : 0.06)}, transparent 55%)`,
      `linear-gradient(180deg, ${top} 0%, ${bg} 60%, ${bottom} 100%)`,
    ].join(', '),
  };
};

export const THEME_VAR_NAMES: string[] = Object.keys(buildThemeVars(PRESET_THEMES[0]));

/** Validates a theme read back from storage — it may be hand-edited or from an older version. */
export const isCustomTheme = (value: unknown): value is ThemeDefinition => {
  const theme = value as Partial<ThemeDefinition> | null;
  const colors = theme?.colors as Partial<ThemeColors> | undefined;

  return (
    typeof theme?.id === 'string' &&
    theme.id.startsWith(CUSTOM_THEME_ID_PREFIX) &&
    typeof theme.name === 'string' &&
    theme.name.trim().length > 0 &&
    (theme.mode === 'dark' || theme.mode === 'light') &&
    COLOR_FIELDS.every((field) => isHexColor(colors?.[field]))
  );
};
