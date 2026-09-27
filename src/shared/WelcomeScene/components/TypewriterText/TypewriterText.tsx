import { useEffect, useState, type FC } from 'react';

const START_DELAY_MS = 200;
const TYPE_INTERVAL_MS = 70;

export interface TypewriterTextProps {
  text: string;
}

/** Types `text` out letter by letter; the caret sits on the last typed letter and blinks once done. */
export const TypewriterText: FC<TypewriterTextProps> = ({ text }) => {
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    let interval: number | undefined;

    const start = window.setTimeout(() => {
      let count = 0;

      interval = window.setInterval(() => {
        count += 1;
        setTyped(count);

        if (count >= text.length) {
          window.clearInterval(interval);
        }
      }, TYPE_INTERVAL_MS);
    }, START_DELAY_MS);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [text]);

  const className = ['welcome-scene__text', typed >= text.length ? 'welcome-scene__text--done' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {text.split('').map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={[
            'welcome-scene__letter',
            index < typed ? 'welcome-scene__letter--typed' : '',
            index === typed - 1 ? 'welcome-scene__letter--current' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {char}
        </span>
      ))}
    </div>
  );
};
