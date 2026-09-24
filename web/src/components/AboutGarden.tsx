import { useEffect, useMemo, useRef } from 'react';

// Garden scene ported from the marketing site's 404 page (Новая папка/
// marketing-site/assets/notfound.js): flowers that sway on their own and
// tilt away from the cursor, fireflies, and the sitting character in the
// middle. The original built ~1200 DOM nodes (an inline SVG with a blur
// filter each) and called getBoundingClientRect on every one per mouse
// move, which stuttered and took a while to appear. Here the whole bed is
// drawn on one <canvas> instead: each flower head is a pre-rendered
// sprite, all stems go into a single path per layer, and the loop only
// runs while the bed is actually on screen.
const COLORS = ['#f0a476', '#ef8f75', '#8f7dff', '#5fd3c4', '#ffd08a'];
const FIREFLY_COLORS = ['#ffe9a8', '#c9f7e6', '#d8cbff'];

// The bed is laid out inside an 820px band pinned to the page bottom (the
// 404 page's viewport height); the canvas only covers the lowest part of
// it, where flowers and the character actually are.
const BAND_H = 820;
const CANVAS_H = 380;
const CHARACTER_H = 280;
const CHARACTER_BOTTOM = BAND_H * 0.09;
const SWAY = (3 * Math.PI) / 180;
const MAX_TILT = (16 * Math.PI) / 180;
const SPRITE = 24; // CSS px, flower head sprite size

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * k);
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

// Flower head (four petals + center) drawn at the 404 SVG's 0.85 scale.
function makeHeadSprite(color: string, brightness: number, dpr: number) {
  const size = SPRITE * dpr;
  const petals = document.createElement('canvas');
  petals.width = petals.height = size;
  const p = petals.getContext('2d')!;
  p.scale(dpr, dpr);
  p.filter = 'blur(0.5px)';
  p.fillStyle = shade(color, brightness);
  const s = 0.85;
  for (const [x, y] of [
    [5.8, 12.6],
    [14.2, 12.6],
    [7.3, 7.8],
    [12.7, 7.8],
  ]) {
    p.beginPath();
    p.arc(SPRITE / 2 + (x - 10) * s, SPRITE / 2 + (y - 10.2) * s, 3.4 * s, 0, Math.PI * 2);
    p.fill();
  }

  const out = document.createElement('canvas');
  out.width = out.height = size;
  const o = out.getContext('2d')!;
  o.globalAlpha = 0.85;
  o.drawImage(petals, 0, 0);
  o.scale(dpr, dpr);
  o.globalAlpha = 0.9;
  o.fillStyle = shade('#ffd66b', brightness);
  o.beginPath();
  o.arc(SPRITE / 2, SPRITE / 2, 2.1 * s, 0, Math.PI * 2);
  o.fill();
  return out;
}

interface Flower {
  pct: number;
  bottom: number; // px above the band's bottom edge
  stem: number; // px from base to head center
  period: number; // sway period, seconds
  phase: number;
  tilt: number; // current mouse tilt, radians
  sprite: number; // index into the layer's sprite list
}

export function AboutGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fireflies = useMemo(
    () =>
      Array.from({ length: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 18 }, () => {
        const size = rand(3, 7);
        const color = pick(FIREFLY_COLORS);
        return {
          width: size,
          height: size,
          left: `${rand(4, 96)}%`,
          top: `${rand(8, 78)}%`,
          background: color,
          boxShadow: `0 0 ${(size * 2.4).toFixed(1)}px ${(size * 1.1).toFixed(1)}px ${color}`,
          '--about-fx': `${rand(-18, 18).toFixed(1)}px`,
          '--about-fy': `${rand(-22, -8).toFixed(1)}px`,
          animationDuration: `${rand(3, 6).toFixed(2)}s`,
          animationDelay: `-${rand(0, 6).toFixed(2)}s`,
        } as React.CSSProperties;
      }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprites = {
      back: COLORS.map((c) => makeHeadSprite(c, 0.75, dpr)),
      front: COLORS.map((c) => makeHeadSprite(c, 1, dpr)),
    };

    // One even bed across the full width, with a gentle rise around the
    // character. Only low flowers may sit in front of her, so nothing
    // reads as growing out of her torso.
    const back: Flower[] = [];
    const front: Flower[] = [];
    const count = canvas.clientWidth < 640 ? 700 : 1200;
    for (let i = 0; i < count; i++) {
      const pct = rand(0, 1);
      const floorLift = 13;
      const peakBonus = Math.max(0, 15 - Math.abs(pct * 100 - 50) * 0.5);
      const bottomPct = rand(floorLift * 0.35, floorLift + peakBonus);
      const h = rand(26, 46);
      const flower: Flower = {
        pct,
        bottom: (bottomPct / 100) * BAND_H,
        stem: h - 8.67 - 0.075 * h,
        period: rand(4, 6.5),
        phase: rand(0, Math.PI * 2),
        tilt: 0,
        sprite: Math.floor(Math.random() * COLORS.length),
      };
      (bottomPct < 15 && Math.random() < 1 / 3 ? front : back).push(flower);
    }

    // Character with its drop shadow baked in once, not re-blurred per frame.
    let character: HTMLCanvasElement | null = null;
    const img = new Image();
    img.src = '/about/character-sitting.png';
    img.onload = () => {
      const w = (img.naturalWidth / img.naturalHeight) * CHARACTER_H;
      const pad = 40;
      const c = document.createElement('canvas');
      c.width = (w + pad * 2) * dpr;
      c.height = (CHARACTER_H + pad * 2) * dpr;
      const g = c.getContext('2d')!;
      g.scale(dpr, dpr);
      g.shadowColor = 'rgba(0, 0, 0, 0.5)';
      g.shadowBlur = 20;
      g.shadowOffsetY = 14;
      g.drawImage(img, pad, pad, w, CHARACTER_H);
      character = c;
      if (!running) draw(performance.now());
    };

    let width = 0;
    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(CANVAS_H * dpr);
      if (!running) draw(performance.now());
    };

    let mouseX: number | null = null;
    let canvasLeft = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
    };

    const drawLayer = (flowers: Flower[], layerSprites: HTMLCanvasElement[], stemColor: string, t: number, k: number) => {
      const heads: [number, number, number][] = [];
      ctx.beginPath();
      for (const f of flowers) {
        const x = f.pct * width;
        if (mouseX !== null) {
          const dx = x + canvasLeft - mouseX;
          const influence = Math.max(0, 1 - Math.abs(dx) / 240);
          f.tilt += (Math.sign(dx) * influence * MAX_TILT - f.tilt) * k;
        }
        const a = f.tilt + (reduceMotion ? 0 : Math.sin((t / f.period) * Math.PI * 2 + f.phase) * SWAY);
        const baseY = CANVAS_H - f.bottom;
        const hx = x + Math.sin(a) * f.stem;
        const hy = baseY - Math.cos(a) * f.stem;
        const sx = x + Math.sin(a) * (f.stem - 4.6);
        const sy = baseY - Math.cos(a) * (f.stem - 4.6);
        ctx.moveTo(x, baseY);
        ctx.lineTo(sx, sy);
        heads.push([hx, hy, f.sprite]);
      }
      ctx.strokeStyle = stemColor;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      for (const [hx, hy, s] of heads) {
        ctx.drawImage(layerSprites[s], hx - SPRITE / 2, hy - SPRITE / 2, SPRITE, SPRITE);
      }
    };

    let last = performance.now();
    const draw = (now: number) => {
      const t = now / 1000;
      const k = 1 - Math.exp(-(now - last) / 110);
      last = now;
      canvasLeft = canvas.getBoundingClientRect().left;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, CANVAS_H);
      drawLayer(back, sprites.back, 'rgba(58, 74, 58, 0.41)', t, k);
      if (character) {
        const pad = 40;
        const cw = character.width / dpr;
        const ch = character.height / dpr;
        const maxW = width * 0.8 + pad * 2;
        const scale = Math.min(1, maxW / cw);
        const w = cw * scale;
        const h = ch * scale;
        ctx.drawImage(character, width / 2 - w / 2, CANVAS_H - CHARACTER_BOTTOM - h + pad * scale, w, h);
      }
      drawLayer(front, sprites.front, 'rgba(58, 74, 58, 0.55)', t, k);
    };

    let raf = 0;
    let running = false;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Only animate while the bed is on screen - most of the time the
    // reader is up at the carousel and the garden is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
    io.observe(canvas);
    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      setRunning(false);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('mousemove', onMove);
      img.onload = null;
    };
  }, []);

  return (
    <div className="about-garden" aria-hidden="true">
      {fireflies.map((style, i) => (
        <div key={i} className="about-firefly" style={style} />
      ))}
      <div className="about-bed">
        <div className="about-glow" />
        <div className="about-bed-glow" />
        <canvas className="about-bed-canvas" ref={canvasRef} />
        <div className="about-ground" />
      </div>
    </div>
  );
}
