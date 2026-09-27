import type { FC } from 'react';

import { useGamepadNavigation } from '@/app/hooks/useGamepadNavigation';

/** Mounts the gamepad-driven focus navigation for the whole app. Renders nothing. */
export const GamepadNavigation: FC = () => {
  useGamepadNavigation();

  return null;
};
