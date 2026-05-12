import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const HEX_SIZE = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const LAYER_HEIGHT = 20;
const GOLDEN_ANGLE = 137.508;
const WORLD_HEX_RADIUS = 38;

const DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const KEY_COLOR_MAP: Record<string, string> = {
  Backspace: '#ff4d6d',
};

for (let i = 0; i < 26; i += 1) {
  const letter = String.fromCharCode(65 + i);
  KEY_COLOR_MAP[letter] = `hsl(${Math.round(i * GOLDEN_ANGLE) % 360}, 88%, 62%)`;
  KEY_COLOR_MAP[letter.toLowerCase()] = KEY_COLOR_MAP[letter];
}

for (let i = 0; i <= 9; i += 1) {
  KEY_COLOR_MAP[i.toString()] = `hsl(${(i * 36 + 190) % 360}, 82%, 66%)`;
}

type VisibleHex = {
  q: number;
  r: number;
  wx: number;
  wy: number;
  x: number;
  y: number;
  id: string;
  worldDistance: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

type TypeGlyph = {
  id: string;
  q: number;
  r: number;
  x: number;
  y: number;
  char: string;
  color: string;
  born: number;
};

type Wave = {
  x: number;
  y: number;
  startTime: number;
  color: string;
  strength: number;
};

type BeatWave = {
  startTime: number;
  strength: number;
  hue: number;
  radiusSpeed: number;
};

type AudioRotationBurst = {
  until: number;
  step: number;
};

function axialToPixel(q: number, r: number) {
  return {
    x: HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: HEX_SIZE * 1.5 * r,
  };
}

function pixelToAxial(x: number, y: number) {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / HEX_SIZE;
  const r = ((2 / 3) * y) / HEX_SIZE;
  return axialRound(q, r);
}

function axialRound(q: number, r: number) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  else rs = -rq - rr;

  return { q: rq, r: rr, s: rs };
}

function axialDistance(q: number, r: number) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
}

function getPulseShade(color: string, pulse: number) {
  if (!color.startsWith('#')) return color;
  return blendHex(shadeHex(color, -42 + Math.round(pulse * 36)), '#ffffff', pulse * 0.22);
}

const BOARD_HEXES = Array.from({ length: WORLD_HEX_RADIUS * 2 + 1 }, (_, ri) => ri - WORLD_HEX_RADIUS)
  .flatMap((r) =>
    Array.from({ length: WORLD_HEX_RADIUS * 2 + 1 }, (_, qi) => qi - WORLD_HEX_RADIUS)
      .filter((q) => axialDistance(q, r) <= WORLD_HEX_RADIUS)
      .map((q) => ({ q, r, ...axialToPixel(q, r) }))
  );

function drawHexTop(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i);
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function shadeHex(color: string, amount: number) {
  if (!color.startsWith('#')) return color;
  const raw = color.slice(1);
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return color;

  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function blendHex(c1: string, c2: string, ratio: number) {
  if (!c1.startsWith('#') || !c2.startsWith('#')) return ratio > 0.5 ? c2 : c1;
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - ratio) + ((b >> 16) & 255) * ratio);
  const g = Math.round(((a >> 8) & 255) * (1 - ratio) + ((b >> 8) & 255) * ratio);
  const bl = Math.round((a & 255) * (1 - ratio) + (b & 255) * ratio);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

function buildVisibleHexes(width: number, height: number, zoom: number, angleRad: number): VisibleHex[] {
  const cx = width / 2;
  const cy = height / 2;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const hexes: VisibleHex[] = [];

  for (const boardHex of BOARD_HEXES) {
      const { q, r, x: bx, y: by } = boardHex;
      const worldDistance = Math.hypot(bx, by);

      const rx = bx * cosA - by * sinA;
      const ry = bx * sinA + by * cosA;
      const x = cx + rx * zoom;
      const y = cy + ry * zoom;

      if (x > -HEX_SIZE * zoom && x < width + HEX_SIZE * zoom && y > -HEX_SIZE * zoom && y < height + HEX_SIZE * zoom) {
        hexes.push({ q, r, wx: bx, wy: by, x, y, id: `${q},${r}`, worldDistance });
      }
  }

  return hexes.sort((a, b) => a.y - b.y);
}

export function HexCanvas({ audioAnalyser }: { audioAnalyser?: AnalyserNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerDown = useRef(false);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const lastPaintedHex = useRef<string | null>(null);
  const zoomLevel = useRef(1);
  const viewAngleCurrent = useRef(0);
  const viewAngleTarget = useRef(0);
  const particles = useRef<Particle[]>([]);
  const typeGlyphs = useRef<TypeGlyph[]>([]);
  const typeWaves = useRef<Wave[]>([]);
  const hexTrails = useRef<Record<string, { lastActive: number; color: string }>>({});
  const audioEnergyHistory = useRef<number[]>([]);
  const previousAudioEnergy = useRef(0);
  const beatWaves = useRef<BeatWave[]>([]);
  const isRightPointerDown = useRef(false);
  const lastRightPaint = useRef(0);
  const audioRotationBurst = useRef<AudioRotationBurst | null>(null);
  const lastAudioRotation = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const frequencyData = new Uint8Array(audioAnalyser ? audioAnalyser.frequencyBinCount : 0);
    const timeData = new Uint8Array(audioAnalyser ? audioAnalyser.fftSize : 0);

    const getAxialFromMouse = (clientX: number, clientY: number) => {
      const tx = (clientX - width / 2) / zoomLevel.current;
      const ty = (clientY - height / 2) / zoomLevel.current;
      const angleRad = -viewAngleCurrent.current;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      return pixelToAxial(tx * cos - ty * sin, tx * sin + ty * cos);
    };

    const paintAtPointer = (clientX: number, clientY: number) => {
      const state = useStore.getState();
      if (state.activeMode !== 'sculpt') return;
      const { q, r } = getAxialFromMouse(clientX, clientY);
      if (axialDistance(q, r) > WORLD_HEX_RADIUS) return;
      const id = `${q},${r}`;
      if (id === lastPaintedHex.current) return;
      state.paintHex(id, q, r);
      lastPaintedHex.current = id;
    };

    const render = (time: number) => {
      const state = useStore.getState();
      const { activeMode, grid, reflectionsEnabled, hoverElement } = state;

      viewAngleCurrent.current += (viewAngleTarget.current - viewAngleCurrent.current) * 0.12;
      if (isRightPointerDown.current && state.activeMode === 'sculpt') {
        viewAngleTarget.current += (state.sculptRotationStep * Math.PI) / 180 / 18;
        if (time - lastRightPaint.current > 45) {
          lastPaintedHex.current = null;
          paintAtPointer(mousePos.current.x, mousePos.current.y);
          lastRightPaint.current = time;
        }
      }
      if (activeMode === 'audio' && audioRotationBurst.current) {
        if (time < audioRotationBurst.current.until) {
          viewAngleTarget.current += audioRotationBurst.current.step;
        } else {
          audioRotationBurst.current = null;
        }
      }

      const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
      bg.addColorStop(0, '#0b0f13');
      bg.addColorStop(0.58, '#05080b');
      bg.addColorStop(1, '#010203');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      if (activeMode === 'audio' && audioAnalyser) {
        audioAnalyser.getByteFrequencyData(frequencyData);
        audioAnalyser.getByteTimeDomainData(timeData);

        let low = 0;
        let mid = 0;
        let high = 0;
        for (let i = 1; i < 8; i += 1) low += frequencyData[i];
        for (let i = 8; i < 34; i += 1) mid += frequencyData[i];
        for (let i = 34; i < 96 && i < frequencyData.length; i += 1) high += frequencyData[i];
        low /= 7;
        mid /= 26;
        high /= Math.max(1, Math.min(62, frequencyData.length - 34));

        let rms = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const centered = (timeData[i] - 128) / 128;
          rms += centered * centered;
        }
        rms = Math.sqrt(rms / Math.max(1, timeData.length)) * 255;

        const energy = low * 0.56 + mid * 0.22 + high * 0.08 + rms * 0.34;
        audioEnergyHistory.current.push(energy);
        if (audioEnergyHistory.current.length > 48) audioEnergyHistory.current.shift();
        const avg = audioEnergyHistory.current.reduce((sum, item) => sum + item, 0) / audioEnergyHistory.current.length;
        const variance = audioEnergyHistory.current.reduce((sum, item) => sum + Math.pow(item - avg, 2), 0) / audioEnergyHistory.current.length;
        const threshold = avg + Math.sqrt(variance) * 1.25;
        const lastBeat = beatWaves.current[beatWaves.current.length - 1];

        if (energy > 82 && energy > threshold && energy - previousAudioEnergy.current > 16 && (!lastBeat || time - lastBeat.startTime > 170)) {
          const strength = Math.min(1.5, energy / 175);
          beatWaves.current.push({
            startTime: time,
            strength,
            hue: (time * 0.07 + low * 1.4 + mid * 0.55) % 360,
            radiusSpeed: 0.34 + Math.min(0.2, low / 900),
          });

          const sinceRotation = time - lastAudioRotation.current;
          const shouldRotate =
            sinceRotation > 720 &&
            (strength > 1.16 || low > 168 || (strength > 0.92 && Math.random() > 0.58));

          if (shouldRotate) {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const shouldFullSpin = strength > 1.22 && low > 182 && Math.random() > 0.42;
            const totalTurn = shouldFullSpin ? Math.PI * 2 : Math.PI / 2;
            const duration = shouldFullSpin ? 1180 : 620;
            const frames = Math.max(10, Math.round(duration / 16));

            audioRotationBurst.current = {
              until: time + duration,
              step: (totalTurn / frames) * direction,
            };
            lastAudioRotation.current = time;
          }
        }
        previousAudioEnergy.current = energy;
      }

      particles.current = particles.current.filter((p) => p.life > 0);
      typeWaves.current = typeWaves.current.filter((wave) => time - wave.startTime < 2100);
      beatWaves.current = beatWaves.current.filter((wave) => time - wave.startTime < 3200);

      const zoom = zoomLevel.current;
      const lowDetail = zoom < 0.62;
      const visibleHexes = buildVisibleHexes(width, height, zoom, viewAngleCurrent.current);
      const glyphById = new Map(typeGlyphs.current.map((glyph) => [glyph.id, glyph]));
      const lightX = Math.cos(time * 0.001) * 220;
      const lightY = Math.sin(time * 0.001) * 160;

      for (const hex of visibleHexes) {
        const { q, r, wx, wy, x, y, id, worldDistance } = hex;
        const hexData = grid[id];
        let yOffset = 0;
        let hexGlow = 0;
        let baseColor = blendHex('#0d1218', '#1a222c', Math.sin(time * 0.0007 + q * 0.19 + r * 0.13) * 0.5 + 0.5);
        let edgeColor = '#202a33';

        if (activeMode === 'hover') {
          const mouseDist = Math.hypot(x - mousePos.current.x, y - mousePos.current.y);
            const hoverRadius = hoverElement === 'hex' ? 300 * zoom : 170 * zoom;
            const decay = Math.max(0, 1 - mouseDist / hoverRadius);
            if (decay > 0) {
              const ripple = Math.sin(mouseDist * 0.08 - time * 0.006) * 0.5 + 0.5;
              const intensity = decay * (0.45 + ripple * 0.55);

            if (hoverElement === 'hex') {
              const angle = Math.atan2(y - mousePos.current.y, x - mousePos.current.x);
              const symmetricBand = Math.round(angle / (Math.PI / 3));
              const ring = Math.floor(mouseDist / (42 * zoom));
              const hue = (time * 0.045 + symmetricBand * 60 + ring * 18) % 360;
              yOffset = -Math.exp(-Math.pow(mouseDist / (110 * zoom), 2)) * 22 * zoom;
              baseColor = `hsl(${hue}, ${76 + intensity * 20}%, ${22 + intensity * 40}%)`;
              edgeColor = `hsl(${(hue + 45) % 360}, 100%, ${54 + intensity * 20}%)`;
              hexGlow = intensity;
              hexTrails.current[id] = { lastActive: time, color: `hsl(${hue}, 90%, 54%)` };
            }
          }
        }

        const trail = hexTrails.current[id];
        if (trail) {
          const age = time - trail.lastActive;
          if (age < 360) {
            const decay = 1 - age / 360;
            if (activeMode === 'hover' && hoverElement === 'hex') {
              baseColor = trail.color;
              edgeColor = trail.color;
              hexGlow = Math.max(hexGlow, decay * 0.28);
            } else if (activeMode === 'audio') {
              hexGlow = Math.max(hexGlow, decay * 0.35);
            }
          } else {
            delete hexTrails.current[id];
          }
        }

        if (activeMode === 'type') {
          let waveBrightness = 0;
          let waveColor = '';
          for (const wave of typeWaves.current) {
            const age = time - wave.startTime;
            const dist = Math.hypot(wx - wave.x, wy - wave.y);
            const radius = age * 0.82;
            const widthBand = 95;
            const delta = Math.abs(dist - radius);
            if (delta < widthBand) {
              const intensity = (1 - delta / widthBand) * (1 - age / 2100) * wave.strength;
              if (intensity > waveBrightness) {
                waveBrightness = intensity;
                waveColor = wave.color;
              }
            }
          }
          if (waveBrightness > 0) {
            baseColor = waveColor;
            edgeColor = waveColor;
            yOffset = -waveBrightness * 28 * zoom;
            hexGlow = Math.max(hexGlow, waveBrightness);
          }
        }

        if (activeMode === 'audio' && audioAnalyser && frequencyData.length) {
          const distRatio = Math.min(1, worldDistance / 880);
          const bin = Math.min(frequencyData.length - 1, Math.floor(Math.pow(distRatio, 1.35) * (frequencyData.length - 1)));
          let val = frequencyData[bin] / 255;
          let hue = (time * 0.035 + distRatio * 330 + bin * 1.7) % 360;

          for (const wave of beatWaves.current) {
            const age = time - wave.startTime;
            const radius = age * wave.radiusSpeed;
            const band = 74 + wave.strength * 55;
            const diff = Math.abs(worldDistance - radius);
            if (diff < band) {
              const pulse = (1 - diff / band) * (1 - age / 3200) * wave.strength;
              val = Math.max(val, pulse);
              hue = (wave.hue + age * 0.09 + diff * 0.4) % 360;
            }
          }

          if (val > 0.08) {
            baseColor = `hsl(${hue}, ${70 + val * 25}%, ${18 + val * 54}%)`;
            edgeColor = `hsl(${(hue + 50) % 360}, 95%, ${38 + val * 38}%)`;
            yOffset = -val * 48 * zoom;
            hexGlow = Math.max(hexGlow, val * 0.85);
            hexTrails.current[id] = { lastActive: time, color: edgeColor };

            if (val > 0.72 && particles.current.length < 260 && Math.random() < 0.018) {
              particles.current.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 3.4,
                vy: -Math.random() * 4.2 - 1.2,
                life: 1,
                color: edgeColor,
                size: 1.4 + Math.random() * 3,
              });
            }
          }
        }

        if (!lowDetail && hexGlow > 0) {
          ctx.shadowBlur = hexGlow * 16 * zoom;
          ctx.shadowColor = edgeColor;
        } else {
          ctx.shadowBlur = 0;
        }

        if (lowDetail) {
          ctx.fillStyle = baseColor;
        } else {
          const faceGradient = ctx.createRadialGradient(x - HEX_SIZE * 0.22 * zoom, y + yOffset - HEX_SIZE * 0.18 * zoom, 0, x, y + yOffset, HEX_SIZE * zoom);
          faceGradient.addColorStop(0, baseColor);
          faceGradient.addColorStop(1, shadeHex(baseColor, -18));
          ctx.fillStyle = faceGradient;
        }
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = Math.max(0.55, zoom);
        drawHexTop(ctx, x, y + yOffset, HEX_SIZE * zoom);
        ctx.fill();
        if (!lowDetail) ctx.stroke();
        ctx.shadowBlur = 0;

        const glyph = glyphById.get(id);
        if (activeMode === 'type' && glyph) {
          const age = time - glyph.born;
          const float = Math.sin(time * 0.004 + q) * 3;
          ctx.save();
          ctx.fillStyle = glyph.color;
          ctx.shadowColor = glyph.color;
          ctx.shadowBlur = 14;
          ctx.font = `700 ${Math.max(18, 30 * zoom)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = Math.max(0.28, 1 - age / 12000);
          ctx.fillText(glyph.char, x, y + yOffset - 24 * zoom + float);
          ctx.restore();
        }

        if (!lowDetail && activeMode === 'hover' && hoverElement === 'flower') {
          const mouseDist = Math.hypot(x - mousePos.current.x, y - mousePos.current.y);
          const intensity = Math.max(0, 1 - mouseDist / (165 * zoom));
          const fScale = (0.78 + intensity * 0.55) * zoom;
          const sway = Math.sin(time * 0.0014 + wx * 0.03) * 6 * zoom + (mousePos.current.x - x) * intensity * 0.05;
          const petals = 5 + Math.abs((q + r) % 3);
          ctx.strokeStyle = `hsl(${126 + q * 3}, 64%, 42%)`;
          ctx.lineWidth = 2 * zoom;
          ctx.beginPath();
          ctx.moveTo(x, y + 2 * zoom);
          ctx.quadraticCurveTo(x + sway * 0.35, y - 14 * zoom, x + sway, y - 31 * fScale);
          ctx.stroke();
          for (let p = 0; p < petals; p += 1) {
            const pa = (Math.PI * 2 * p) / petals + time * 0.001;
            ctx.fillStyle = `hsl(${(wx * 2 + wy + p * 28 + time * 0.015) % 360}, 86%, 63%)`;
            ctx.beginPath();
            ctx.ellipse(x + sway + Math.cos(pa) * 7 * fScale, y - 31 * fScale + Math.sin(pa) * 7 * fScale, 4.8 * fScale, 3.3 * fScale, pa, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(x + sway, y - 31 * fScale, 3.5 * fScale, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!lowDetail && activeMode === 'hover' && hoverElement === 'stickman') {
          const mouseDist = Math.hypot(x - mousePos.current.x, y - mousePos.current.y);
          const intensity = Math.max(0, 1 - mouseDist / (150 * zoom));
          const dance = Math.sin(time * 0.008 + q) * intensity;
          const jump = -Math.max(0, intensity - 0.62) * 18 * zoom;
          const sway = Math.sin(time * 0.003 + wx) * 4 * zoom - (mousePos.current.x - x) * intensity * 0.05;
          const baseY = y + jump;
          const shoulderX = x + sway;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `hsl(${205 + intensity * 105}, 90%, 82%)`;
          ctx.lineWidth = 2.4 * zoom;
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
          ctx.beginPath();
          ctx.ellipse(x, y + 6 * zoom, 11 * zoom, 3.2 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(x, baseY - 2 * zoom);
          ctx.lineTo(shoulderX, baseY - 27 * zoom);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x, baseY - 2 * zoom);
          ctx.lineTo(x - 9 * zoom - dance * 8 * zoom, baseY + 10 * zoom);
          ctx.moveTo(x, baseY - 2 * zoom);
          ctx.lineTo(x + 9 * zoom + dance * 8 * zoom, baseY + 10 * zoom);
          ctx.stroke();

          const armWave = Math.sin(time * 0.012 + q) * (8 + intensity * 9) * zoom;
          ctx.beginPath();
          ctx.moveTo(shoulderX - 13 * zoom, baseY - 18 * zoom + armWave * 0.45);
          ctx.lineTo(shoulderX, baseY - 20 * zoom);
          ctx.lineTo(shoulderX + 13 * zoom, baseY - 18 * zoom - armWave);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(shoulderX, baseY - 35 * zoom, 5.8 * zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(shoulderX - 2 * zoom, baseY - 36 * zoom, 0.9 * zoom, 0, Math.PI * 2);
          ctx.arc(shoulderX + 2 * zoom, baseY - 36 * zoom, 0.9 * zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(shoulderX, baseY - 34 * zoom, 2.2 * zoom, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
          ctx.restore();
        }

        if (activeMode === 'sculpt' && hexData?.layers.length) {
          if (!lowDetail) {
          ctx.fillStyle = 'rgba(0,0,0,0.56)';
          ctx.beginPath();
          ctx.ellipse(x, y + 5 * zoom, HEX_SIZE * 0.9 * zoom, HEX_SIZE * 0.36 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();
          }

          for (let i = 0; i < hexData.layers.length; i += 1) {
            const layer = hexData.layers[i];
            const layerY = y - (i + 1) * LAYER_HEIGHT * zoom;
            let topColor = layer.color;
            let leftColor = shadeHex(layer.color, -34);
            let rightColor = shadeHex(layer.color, -62);
            let alpha = 1;

            if (layer.material === 'chameleon') {
              const hue = (time * 0.045 + x * 0.08 + i * 42) % 360;
              topColor = `hsl(${hue}, 84%, 60%)`;
              leftColor = `hsl(${hue}, 78%, 39%)`;
              rightColor = `hsl(${hue}, 78%, 25%)`;
            } else if (layer.material === 'plasma') {
              const pulse = Math.sin(time * 0.006 + x * 0.02 + y * 0.015 + i) * 0.5 + 0.5;
              topColor = getPulseShade(layer.color, pulse);
              leftColor = shadeHex(layer.color, -18 - Math.round(pulse * 16));
              rightColor = shadeHex(layer.color, -54 + Math.round(pulse * 14));
              ctx.shadowBlur = lowDetail ? 0 : 18 * zoom;
              ctx.shadowColor = topColor;
            } else if (layer.material === 'glass') {
              alpha = 0.64;
              topColor = blendHex(layer.color, '#ffffff', 0.34);
              leftColor = blendHex(layer.color, '#7dd3fc', 0.28);
              rightColor = blendHex(layer.color, '#0f172a', 0.35);
            } else if (layer.material === 'chrome') {
              topColor = blendHex(layer.color, '#f8fafc', 0.58);
              leftColor = blendHex(layer.color, '#94a3b8', 0.32);
              rightColor = blendHex(layer.color, '#111827', 0.32);
            }

            if (reflectionsEnabled) {
              const angleIndex = Math.round((((viewAngleCurrent.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 3));
              const leftNeighbor = grid[`${q + DIRECTIONS[(4 + angleIndex) % 6].q},${r + DIRECTIONS[(4 + angleIndex) % 6].r}`];
              const rightNeighbor = grid[`${q + DIRECTIONS[angleIndex % 6].q},${r + DIRECTIONS[angleIndex % 6].r}`];
              if (leftNeighbor?.layers[i]) leftColor = blendHex(leftColor, leftNeighbor.layers[i].color, 0.25);
              if (rightNeighbor?.layers[i]) rightColor = blendHex(rightColor, rightNeighbor.layers[i].color, 0.25);
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = topColor;
            drawHexTop(ctx, x, layerY, HEX_SIZE * zoom);
            ctx.fill();
            ctx.strokeStyle = layer.material === 'chrome' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.32)';
            ctx.lineWidth = layer.material === 'chrome' ? 2 * zoom : zoom;
            if (!lowDetail) ctx.stroke();

            const lDist = Math.hypot(x - width / 2 - lightX, layerY - height / 2 - lightY);
            if (!lowDetail && layer.material === 'chrome' && lDist < 135 * zoom) {
              ctx.fillStyle = `rgba(255,255,255,${1 - lDist / (135 * zoom)})`;
              ctx.beginPath();
              ctx.arc(x - 7 * zoom, layerY - 5 * zoom, 5 * zoom, 0, Math.PI * 2);
              ctx.fill();
            }

            if (lowDetail) {
              ctx.globalAlpha = 1;
              ctx.shadowBlur = 0;
              continue;
            }

            ctx.fillStyle = leftColor;
            ctx.beginPath();
            ctx.moveTo(x - (HEX_WIDTH / 2) * zoom, layerY + (HEX_SIZE / 2) * zoom);
            ctx.lineTo(x, layerY + HEX_SIZE * zoom);
            ctx.lineTo(x, layerY + HEX_SIZE * zoom + LAYER_HEIGHT * zoom);
            ctx.lineTo(x - (HEX_WIDTH / 2) * zoom, layerY + (HEX_SIZE / 2) * zoom + LAYER_HEIGHT * zoom);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = rightColor;
            ctx.beginPath();
            ctx.moveTo(x, layerY + HEX_SIZE * zoom);
            ctx.lineTo(x + (HEX_WIDTH / 2) * zoom, layerY + (HEX_SIZE / 2) * zoom);
            ctx.lineTo(x + (HEX_WIDTH / 2) * zoom, layerY + (HEX_SIZE / 2) * zoom + LAYER_HEIGHT * zoom);
            ctx.lineTo(x, layerY + HEX_SIZE * zoom + LAYER_HEIGHT * zoom);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
        }
      }

      for (const p of particles.current) {
        p.x += p.vx * zoom;
        p.y += p.vy * zoom;
        p.vy += 0.025;
        p.life -= 0.018;
        if (p.life <= 0) continue;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      mousePos.current = { x: event.clientX, y: event.clientY };
      if (isPointerDown.current) paintAtPointer(event.clientX, event.clientY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 2) {
        event.preventDefault();
        mousePos.current = { x: event.clientX, y: event.clientY };
        isRightPointerDown.current = true;
        lastPaintedHex.current = null;
        paintAtPointer(event.clientX, event.clientY);
        return;
      }
      if (event.button !== 0) return;
      isPointerDown.current = true;
      paintAtPointer(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 2) isRightPointerDown.current = false;
      isPointerDown.current = false;
      lastPaintedHex.current = null;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomLevel.current = Math.max(0.48, Math.min(2.35, zoomLevel.current - event.deltaY * 0.001));
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (useStore.getState().activeMode !== 'type') return;

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const now = performance.now();
        typeGlyphs.current.forEach((glyph, index) => {
          const color = `hsl(${(index * GOLDEN_ANGLE + now * 0.04) % 360}, 94%, ${58 + (index % 3) * 6}%)`;
          typeWaves.current.push({ x: glyph.x, y: glyph.y, startTime: now + index * 24, color, strength: 1.05 });
          for (let i = 0; i < 3 && particles.current.length < 240; i += 1) {
            particles.current.push({
              x: width / 2 + glyph.x * zoomLevel.current,
              y: height / 2 + glyph.y * zoomLevel.current,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1,
              color,
              size: 1.6 + Math.random() * 2.2,
            });
          }
        });
        typeGlyphs.current = [];
        return;
      }

      if (event.key.length !== 1 && event.key !== 'Backspace') return;
      const cols = Math.ceil(width / zoomLevel.current / HEX_WIDTH);
      const rows = Math.ceil(height / zoomLevel.current / (HEX_HEIGHT * 0.75));
      const q = Math.floor((Math.random() - 0.5) * cols * 0.86);
      const r = Math.floor((Math.random() - 0.5) * rows * 0.86);
      const { x, y } = axialToPixel(q, r);
      const char = event.key === 'Backspace' ? '<' : event.key.toUpperCase();
      const hue = (typeGlyphs.current.length * GOLDEN_ANGLE + performance.now() * 0.03) % 360;
      const color = KEY_COLOR_MAP[event.key] || KEY_COLOR_MAP[char] || `hsl(${hue}, 88%, 62%)`;
      typeGlyphs.current.push({ id: `${q},${r}`, q, r, x, y, char, color, born: performance.now() });
      if (typeGlyphs.current.length > 32) typeGlyphs.current.shift();
    };

    animationFrameId = requestAnimationFrame(render);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioAnalyser]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      style={{ cursor: useStore((state) => (state.activeMode === 'sculpt' ? 'crosshair' : 'default')) }}
    />
  );
}
