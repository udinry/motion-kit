export type Script = 'latin' | 'devanagari';

/**
 * Seconds a text must stay on screen (MOTION.md rule 9).
 * latin: letters/15 + 1.0 (Roman Hinglish or English). devanagari: letters/12 + 1.2.
 * Spaces and punctuation are not counted.
 */
export const readTime = (text: string, script: Script = 'latin'): number => {
  const letters = Array.from(text.replace(/[\s.,!?;:'"()\-]/g, '')).length;
  return script === 'devanagari' ? letters / 12 + 1.2 : letters / 15 + 1.0;
};

export const readFrames = (text: string, script: Script = 'latin', fps = 30): number =>
  Math.ceil(readTime(text, script) * fps);

/** No full stops on screen, and a tidy word list. */
export const cleanText = (text: string): string => text.replace(/[.।]+/g, '').replace(/\s+/g, ' ').trim();

/**
 * J-cut: the next scene's sound starts `lead` frames (4-8) before its picture.
 * Returns the frame to start the Audio sequence at, and the matching startFrom
 * offset to skip into the clip if the sequence would begin before frame 0.
 */
export const jCut = (sceneStartFrame: number, lead = 6): {from: number; trimBefore: number} => {
  const from = sceneStartFrame - lead;
  return from >= 0 ? {from, trimBefore: 0} : {from: 0, trimBefore: -from};
};

/** L-cut mirror: the outgoing scene's sound runs `tail` frames past the cut. */
export const lCutEnd = (sceneEndFrame: number, tail = 6): number => sceneEndFrame + tail;

/** Snap a time in seconds to the nearest beat of a grid (t0 + i*T). Use for cuts on downbeats. */
export const snapToBeat = (seconds: number, t0: number, period: number): number =>
  t0 + Math.round((seconds - t0) / period) * period;
