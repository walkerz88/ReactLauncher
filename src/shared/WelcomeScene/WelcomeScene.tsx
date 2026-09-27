import type { CSSProperties, FC, ReactNode } from 'react';

import { TypewriterText } from './components/TypewriterText';

import './WelcomeScene.css';

export const WELCOME_SCENE_VARIANTS = [
  'reveal',
  'cinematic',
  'typewriter',
  'converge',
  'wave',
  'scan',
  'flip',
  'lines',
] as const;

export type WelcomeSceneVariant = (typeof WELCOME_SCENE_VARIANTS)[number];

export const DEFAULT_WELCOME_SCENE_VARIANT: WelcomeSceneVariant = 'reveal';

const DEFAULT_DURATION_MS = 2300;

const DURATION_MS: Partial<Record<WelcomeSceneVariant, number>> = {
  typewriter: 3200,
};

/** How long the scene should stay on screen before it fades out, so the whole animation is seen. */
export const getWelcomeSceneDuration = (variant: WelcomeSceneVariant): number =>
  DURATION_MS[variant] ?? DEFAULT_DURATION_MS;

const APP_NAME = process.env.REACT_APP_PRODUCT_NAME ?? '';

const LETTER_VARIANTS: readonly WelcomeSceneVariant[] = ['reveal', 'converge', 'wave', 'flip'];

/** Variants that end with the signature accent underline (the others have their own accents). */
const UNDERLINE_VARIANTS: readonly WelcomeSceneVariant[] = ['reveal', 'cinematic', 'converge', 'wave', 'flip'];

export interface WelcomeSceneProps {
  variant: WelcomeSceneVariant;
  preview?: boolean;
}

const renderLetters = (): ReactNode =>
  APP_NAME.split('').map((char, index) => (
    <span key={`${char}-${index}`} className="welcome-scene__letter" style={{ '--i': index } as CSSProperties}>
      {char}
    </span>
  ));

const renderContent = (variant: WelcomeSceneVariant): ReactNode => {
  if (LETTER_VARIANTS.includes(variant)) {
    return (
      <div className="welcome-scene__text">{renderLetters()}</div>
    );
  }

  switch (variant) {
    case 'typewriter':
      return <TypewriterText text={APP_NAME} />;
    case 'scan':
      return (
        <div className="welcome-scene__scan">
          <span className="welcome-scene__text">{APP_NAME}</span>
          <span className="welcome-scene__scanline" />
        </div>
      );
    case 'lines':
      return (
        <div className="welcome-scene__lines">
          <span className="welcome-scene__bar" />
          <span className="welcome-scene__text">{APP_NAME}</span>
          <span className="welcome-scene__bar" />
        </div>
      );
    default:
      return <span className="welcome-scene__text">{APP_NAME}</span>;
  }
};

/**
 * The welcome animation itself: fills its positioned parent and plays once on mount
 * (remount it to replay). Themed only through CSS custom properties.
 */
export const WelcomeScene: FC<WelcomeSceneProps> = ({ variant, preview }) => {
  const className = ['welcome-scene', `welcome-scene--${variant}`, preview ? 'welcome-scene--preview' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-hidden="true" data-id="WelcomeScene">
      <div className="welcome-scene__glow" />
      {renderContent(variant)}
      {UNDERLINE_VARIANTS.includes(variant) && <div className="welcome-scene__underline" />}
    </div>
  );
};
