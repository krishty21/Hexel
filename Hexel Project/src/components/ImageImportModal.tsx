import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';

const OUTPUT_HEX_RADIUS = 29;
const SAMPLE_HEX_SIZE = 1;

function axialToPixel(q: number, r: number) {
  return {
    x: SAMPLE_HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: SAMPLE_HEX_SIZE * 1.5 * r
  };
}

function axialDistance(q: number, r: number) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function getDepth(r: number, g: number, b: number) {
  const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  return Math.max(1, Math.min(7, Math.round(1 + luminance * 3.5 + saturation * 2.4)));
}

type Crop = {
  x: number;
  y: number;
  size: number;
};

export function ImageImportModal({ file, onClose }: { file: File; onClose: () => void }) {
  const setImageGrid = useStore((state) => state.setImageGrid);
  const stopCanvasEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, size: 1 });
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      setImage(img);
      setCrop({
        x: (img.naturalWidth - size) / 2,
        y: (img.naturalHeight - size) / 2,
        size
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const needsCrop = image ? image.naturalWidth > 720 || image.naturalHeight > 720 || image.naturalWidth !== image.naturalHeight : false;
  const imageUrl = useMemo(() => (image ? image.src : ''), [image]);

  const moveCrop = (clientX: number, clientY: number) => {
    if (!image || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const nextX = px * image.naturalWidth - crop.size / 2;
    const nextY = py * image.naturalHeight - crop.size / 2;
    setCrop((current) => ({
      ...current,
      x: Math.max(0, Math.min(image.naturalWidth - current.size, nextX)),
      y: Math.max(0, Math.min(image.naturalHeight - current.size, nextY))
    }));
  };

  const applyImage = () => {
    if (!image) return;

    const sampleCanvas = document.createElement('canvas');
    const sampleSize = 220;
    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const source = needsCrop ? crop : { x: 0, y: 0, size: Math.min(image.naturalWidth, image.naturalHeight) };
    ctx.drawImage(image, source.x, source.y, source.size, source.size, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    const positions: { q: number; r: number; x: number; y: number }[] = [];
    for (let r = -OUTPUT_HEX_RADIUS; r <= OUTPUT_HEX_RADIUS; r += 1) {
      for (let q = -OUTPUT_HEX_RADIUS; q <= OUTPUT_HEX_RADIUS; q += 1) {
        if (axialDistance(q, r) > OUTPUT_HEX_RADIUS) continue;
        const point = axialToPixel(q, r);
        positions.push({ q, r, x: point.x, y: point.y });
      }
    }

    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y));

    const cells = positions.flatMap((position) => {
      const u = (position.x - minX) / (maxX - minX);
      const v = (position.y - minY) / (maxY - minY);
      const sx = Math.max(0, Math.min(sampleSize - 1, Math.round(u * (sampleSize - 1))));
      const sy = Math.max(0, Math.min(sampleSize - 1, Math.round(v * (sampleSize - 1))));
      const index = (sy * sampleSize + sx) * 4;
      const alpha = imageData[index + 3];
      if (alpha < 32) return [];

      return [{
        id: `${position.q},${position.r}`,
        q: position.q,
        r: position.r,
        color: rgbToHex(imageData[index], imageData[index + 1], imageData[index + 2]),
        height: getDepth(imageData[index], imageData[index + 1], imageData[index + 2])
      }];
    });

    setImageGrid(cells);
    onClose();
  };

  if (!image) {
    return (
      <div className="absolute inset-0 z-[80] grid place-items-center bg-black/80 text-white">
        Preparing image...
      </div>
    );
  }

  const previewWidth = 420;
  const previewHeight = previewWidth * (image.naturalHeight / image.naturalWidth);
  const cropStyle = {
    left: `${(crop.x / image.naturalWidth) * 100}%`,
    top: `${(crop.y / image.naturalHeight) * 100}%`,
    width: `${(crop.size / image.naturalWidth) * 100}%`,
    height: `${(crop.size / image.naturalHeight) * 100}%`
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/82 p-6 backdrop-blur-md">
      <div
        className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        onPointerDownCapture={stopCanvasEvent}
        onPointerUpCapture={stopCanvasEvent}
        onWheelCapture={stopCanvasEvent}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Image to Hex Blocks</h2>
            <p className="text-sm text-zinc-400">
              {needsCrop ? 'Drag the region to choose what gets rebuilt on the grid.' : 'This image fits the importer scale and will use the full image.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-300 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <div
            ref={previewRef}
            className="relative mx-auto overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
            style={{ width: previewWidth, maxWidth: '100%', height: previewHeight }}
            onPointerDown={(event) => {
              if (!needsCrop) return;
              setDragging(true);
              moveCrop(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (dragging) moveCrop(event.clientX, event.clientY);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
          >
            <img src={imageUrl} alt="" className="h-full w-full object-fill" draggable={false} />
            {needsCrop && (
              <div className="absolute border-2 border-cyan-300 bg-cyan-300/10 shadow-[0_0_30px_rgba(103,232,249,0.35)]" style={cropStyle} />
            )}
          </div>

          <div className="flex flex-col justify-between gap-4">
            {needsCrop && (
              <label className="grid gap-2 text-sm text-zinc-300">
                Region size
                <input
                  type="range"
                  min={Math.max(64, Math.min(image.naturalWidth, image.naturalHeight) * 0.2)}
                  max={Math.min(image.naturalWidth, image.naturalHeight)}
                  value={crop.size}
                  onChange={(event) => {
                    const size = Number(event.target.value);
                    setCrop((current) => ({
                      size,
                      x: Math.max(0, Math.min(image.naturalWidth - size, current.x)),
                      y: Math.max(0, Math.min(image.naturalHeight - size, current.y))
                    }));
                  }}
                  className="accent-cyan-300"
                />
              </label>
            )}

            <div className="rounded-xl bg-zinc-900 p-3 text-xs text-zinc-400">
              Creates a centered relief mosaic using colored block stacks. Brighter and richer pixels become taller.
            </div>

            <button
              onClick={applyImage}
              className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-cyan-300"
            >
              Build Hex Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
