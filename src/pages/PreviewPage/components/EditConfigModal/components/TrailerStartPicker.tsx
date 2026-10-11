import { useEffect, useRef, useState, type FC } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { Tooltip } from '@/shared/Tooltip';

export interface TrailerStartPickerProps {
  /** `content://` URL of the game's trailer, or `null` if it has none (the slider then works without a preview). */
  trailerSrc: string | null;
  /** The saved percent as typed into the form; empty means "default". */
  value: string;
  onChange: (value: string) => void;
}

/** Same default as the gallery card. */
const DEFAULT_START_PERCENT = 50;

const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Slider for where the gallery card's trailer preview starts, with a live look at that spot of the trailer. */
export const TrailerStartPicker: FC<TrailerStartPickerProps> = ({ trailerSrc, value, onChange }) => {
  const t = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const parsed = Number.parseFloat(value);
  const percent = value.trim() && Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : DEFAULT_START_PERCENT;
  const startTime = (duration * percent) / 100;

  useEffect(() => {
    const video = videoRef.current;

    if (video && duration > 0) {
      video.currentTime = startTime;
    }
  }, [startTime, duration]);

  const togglePlay = async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.currentTime = startTime;

      try {
        await video.play();
      } catch (err) {
        console.error(err);
      }
    } else {
      video.pause();
      video.currentTime = startTime;
    }
  };

  const restartFromStart = async (video: HTMLVideoElement) => {
    video.currentTime = startTime;

    try {
      await video.play();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="trailer-start" data-id="TrailerStartPicker">
      <div className="trailer-start__header">
        <span className="trailer-start__label">{t('editConfig.previewStart')}</span>
        <span className="trailer-start__value">{percent}%</span>
        {value.trim() ? (
          <Tooltip label={t('editConfig.previewStartReset')}>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('editConfig.previewStartReset')}
              onClick={() => onChange('')}
            >
              <RotateCcw size={16} />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <input
        type="range"
        className="trailer-start__slider"
        min={0}
        max={100}
        step={1}
        value={percent}
        aria-label={t('editConfig.previewStart')}
        onChange={(event) => onChange(event.target.value)}
      />

      {trailerSrc ? (
        <div className="trailer-start__preview">
          <video
            ref={videoRef}
            className="trailer-start__video"
            src={trailerSrc}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={(event) => void restartFromStart(event.currentTarget)}
          />
          <div className="trailer-start__controls">
            <button
              type="button"
              className="icon-btn"
              aria-label={playing ? t('editConfig.previewPause') : t('editConfig.previewPlay')}
              onClick={() => void togglePlay()}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span className="trailer-start__time">
              {formatClock(startTime)} / {formatClock(duration)}
            </span>
          </div>
        </div>
      ) : (
        <p className="trailer-start__hint">{t('editConfig.previewStartNoTrailer')}</p>
      )}
    </div>
  );
};
