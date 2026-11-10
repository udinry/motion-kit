import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cleanText} from './timing';
import {ease, expoOut, STAGGER} from './easing';
import {fitFontSize, SAFE_WIDTH} from './fit';

type Props = {
  text: string;
  /** Index of the key word (0-based). It takes the accent colour at 1.15x. */
  accent?: number;
  accentColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  /** Local frame the first word starts rising. */
  start?: number;
  riseFrames?: number;
  gap?: number;
  maxWords?: number;
  /** Frame (local) the line starts to leave; exits take 60% of the entrance. 0 disables. */
  exitAt?: number;
  align?: 'left' | 'center' | 'right';
  /** Widest a word may get (key word at 1.15x included); the font shrinks to fit. */
  maxWidth?: number;
  style?: React.CSSProperties;
};

/**
 * Kinetic type: words rise out of a mask line, 1.5-2 frames apart. At most 6 words, no full stops.
 */
export const MaskRise: React.FC<Props> = ({
  text,
  accent,
  accentColor = '#c8452d',
  color = '#1d1a16',
  fontSize: requestedSize = 96,
  fontFamily = 'Georgia, serif',
  fontWeight = 800,
  start = 0,
  riseFrames = 12,
  gap = STAGGER.word,
  maxWords = 6,
  exitAt = 0,
  align = 'center',
  maxWidth = SAFE_WIDTH,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = cleanText(text).split(' ').slice(0, maxWords);
  const fontSize = fitFontSize(words, requestedSize, {fontFamily, fontWeight, maxWidth, grow: accent !== undefined ? 1.15 : 1, name: 'MaskRise'});
  const exitDur = Math.max(1, Math.round(riseFrames * 0.6));
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        columnGap: fontSize * 0.3,
        rowGap: fontSize * 0.05,
        fontSize,
        fontFamily,
        fontWeight,
        lineHeight: 1.12,
        color,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const isKey = i === accent;
        const p = ease(frame, start + i * gap, riseFrames, expoOut);
        const out = exitAt > 0 ? ease(frame, exitAt + i * gap * 0.6, exitDur, expoOut) : 0;
        const y = (1 - p) * 110 + out * -60;
        const alpha = exitAt > 0 ? 1 - out : 1;
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.1em 0.14em', margin: `-0.1em ${isKey ? 0.0375 * w.length - 0.14 : -0.14}em`}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${y}%) scale(${isKey ? 1 + 0.15 * p : 1})`,
                transformOrigin: '50% 80%',
                color: isKey ? accentColor : color,
                opacity: alpha,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};
