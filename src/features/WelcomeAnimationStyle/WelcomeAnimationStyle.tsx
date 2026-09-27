import { useState, type FC } from 'react';
import { RotateCw } from 'lucide-react';

import { useWelcomeAnimationStore } from '@/app/store/welcomeAnimationStore';
import { useTranslation, type MessageKey } from '@/app/i18n';
import { ToggleGroup, type ToggleGroupOption } from '@/shared/ToggleGroup';
import { WELCOME_SCENE_VARIANTS, WelcomeScene, type WelcomeSceneVariant } from '@/shared/WelcomeScene';

import './WelcomeAnimationStyle.css';

export const WelcomeAnimationStyle: FC = () => {
  const t = useTranslation();
  const enabled = useWelcomeAnimationStore((state) => state.enabled);
  const variant = useWelcomeAnimationStore((state) => state.variant);
  const setVariant = useWelcomeAnimationStore((state) => state.setVariant);
  const [replayCount, setReplayCount] = useState(0);

  if (!enabled) {
    return null;
  }

  const options: ToggleGroupOption<WelcomeSceneVariant>[] = WELCOME_SCENE_VARIANTS.map((value) => ({
    value,
    label: t(`welcomeAnimation.style.${value}` as MessageKey),
  }));

  return (
    <div className="welcome-animation-style" data-id="WelcomeAnimationStyle">
      <ToggleGroup
        className="welcome-animation-style__options"
        options={options}
        value={variant}
        onChange={setVariant}
        ariaLabel={t('welcomeAnimation.styleGroupLabel')}
      />
      <div className="welcome-animation-style__preview">
        <WelcomeScene key={`${variant}-${replayCount}`} variant={variant} preview />
        <button
          type="button"
          className="welcome-animation-style__replay"
          aria-label={t('welcomeAnimation.replay')}
          onClick={() => setReplayCount((count) => count + 1)}
        >
          <RotateCw size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
};
