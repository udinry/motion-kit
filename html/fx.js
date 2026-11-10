import {rng} from './ease.js';

let grainCanvas = null;

/** Film grain on a canvas; seeded by the frame index so every capture gets the same noise. */
export const drawGrain = (ctx, w, h, frame, {opacity = 0.05, scale = 3, seed = 0} = {}) => {
  const gw = Math.ceil(w / scale), gh = Math.ceil(h / scale);
  grainCanvas = grainCanvas || document.createElement('canvas');
  grainCanvas.width = gw;
  grainCanvas.height = gh;
  const octx = grainCanvas.getContext('2d');
  const img = octx.createImageData(gw, gh);
  const r = rng(frame * 7919 + seed);
  for (let i = 0; i < gw * gh; i++) {
    const v = (r() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(grainCanvas, 0, 0, w, h);
  ctx.restore();
};

export const drawVignette = (ctx, w, h, strength = 0.2, tint = '40,28,16') => {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  g.addColorStop(0, `rgba(${tint},0)`);
  g.addColorStop(1, `rgba(${tint},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

export const drawConfetti = (ctx, pieces) => {
  for (const p of pieces) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.scale(1, p.flip);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
};

export const drawFlash = (ctx, w, h, alpha, color = '#fffaf0') => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

export const drawSpotlight = (ctx, w, h, s, angleDeg = 18, color = '255,246,224', strength = 0.7) => {
  if (!s) return;
  const a = ((90 + angleDeg) * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2 - (dx * len) / 2, cy = h / 2 - (dy * len) / 2;
  const g = ctx.createLinearGradient(cx, cy, cx + dx * len, cy + dy * len);
  const at = (p) => Math.max(0, Math.min(1, p / 100));
  g.addColorStop(at(s.a), `rgba(${color},0)`);
  g.addColorStop(at(s.b), `rgba(${color},${strength})`);
  g.addColorStop(at(s.c), `rgba(${color},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};
