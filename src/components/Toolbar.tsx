import { motion } from 'framer-motion';
import { useStore, MaterialType, HoverElement } from '../store';
import {
  Eraser,
  Droplet,
  Sparkles,
  Zap,
  Palette,
  Hexagon,
  Flower2,
  PersonStanding,
  ArrowLeft,
  Trash2,
  ImagePlus,
  Music } from
'lucide-react';
export function Toolbar({
  onAudioUpload,
  onImageUpload


}: {onAudioUpload?: (file: File) => void; onImageUpload?: (file: File) => void;}) {
  const stopCanvasEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const {
    activeMode,
    setActiveMode,
    sculptMaterial,
    setSculptMaterial,
    materialColors,
    setMaterialColor,
    reflectionsEnabled,
    setReflectionsEnabled,
    sculptRotationStep,
    setSculptRotationStep,
    hoverElement,
    setHoverElement,
    clearGrid
  } = useStore();
  if (activeMode === 'menu') return null;
  return (
    <>
      {/* Back Button */}
      <button
        onClick={() => setActiveMode('menu')}
        onPointerDownCapture={stopCanvasEvent}
        onPointerUpCapture={stopCanvasEvent}
        className="absolute top-6 left-6 z-40 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-white p-3 rounded-full hover:bg-zinc-800 transition-colors">
        
        <ArrowLeft size={20} />
      </button>

      {/* Main Toolbar */}
      <motion.div
        initial={{
          y: 50,
          opacity: 0,
          x: '-50%'
        }}
        animate={{
          y: 0,
          opacity: 1,
          x: '-50%'
        }}
        onPointerDownCapture={stopCanvasEvent}
        onPointerUpCapture={stopCanvasEvent}
        onWheelCapture={stopCanvasEvent}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="absolute bottom-8 left-1/2 z-40 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3 rounded-2xl shadow-2xl flex items-center gap-4">
        
        {/* SCULPT MODE TOOLBAR */}
        {activeMode === 'sculpt' &&
        <>
            <div className="flex gap-2">
              {(
            [
            'chrome',
            'glass',
            'plasma',
            'chameleon',
            'eraser'] as
            MaterialType[]).
            map((mat) =>
            <div key={mat} className="flex flex-col items-center gap-2">
                  <button
                onClick={() => setSculptMaterial(mat)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${sculptMaterial === mat ? 'bg-zinc-700 text-white shadow-inner' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                
                    {mat === 'chrome' && <Droplet size={20} />}
                    {mat === 'glass' && <Sparkles size={20} />}
                    {mat === 'plasma' && <Zap size={20} />}
                    {mat === 'chameleon' && <Palette size={20} />}
                    {mat === 'eraser' && <Eraser size={20} />}
                  </button>

                  {/* Color Picker (hide for chameleon/eraser) */}
                  {mat !== 'chameleon' && mat !== 'eraser' &&
              <input
                type="color"
                value={materialColors[mat]}
                onChange={(e) => setMaterialColor(mat, e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />

              }
                </div>
            )}
            </div>

            <div className="w-px h-12 bg-zinc-800 mx-2" />

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                type="checkbox"
                checked={reflectionsEnabled}
                onChange={(e) => setReflectionsEnabled(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900" />
              
                Reflections
              </label>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400">Right-click turn:</label>
                <select
                  value={sculptRotationStep}
                  onChange={(e) => setSculptRotationStep(parseInt(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {[15, 30, 45, 60, 90].map((angle) =>
                    <option key={angle} value={angle}>{angle} deg</option>
                  )}
                </select>
              </div>
              
              <button
              onClick={clearGrid}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
              
                <Trash2 size={14} /> Clear Grid
              </button>

              <label className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer">
                <ImagePlus size={14} /> Image to Hex
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onImageUpload) onImageUpload(file);
                    e.currentTarget.value = '';
                  }} />
              </label>
            </div>
          </>
        }

        {/* HOVER MODE TOOLBAR */}
        {activeMode === 'hover' &&
        <div className="flex gap-2">
            {(['hex', 'flower', 'stickman'] as HoverElement[]).map(
            (el) =>
            <button
              key={el}
              onClick={() => setHoverElement(el)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${hoverElement === el ? 'bg-zinc-700 text-white shadow-inner' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
              
                  {el === 'hex' && <Hexagon size={18} />}
                  {el === 'flower' && <Flower2 size={18} />}
                  {el === 'stickman' && <PersonStanding size={18} />}
                  <span className="capitalize">{el}</span>
                </button>

          )}
          </div>
        }

        {/* TYPE MODE TOOLBAR */}
        {activeMode === 'type' &&
        <div className="px-4 py-2 text-zinc-300 font-mono">
            Type anything on your keyboard...
          </div>
        }

        {/* AUDIO MODE TOOLBAR */}
        {activeMode === 'audio' &&
        <div className="flex items-center gap-4 px-2">
            <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl cursor-pointer transition-colors">
              <Music size={18} />
              <span>Upload MP3</span>
              <input
              type="file"
              accept="audio/mp3,audio/wav"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && onAudioUpload) {
                  onAudioUpload(e.target.files[0]);
                }
              }} />
            
            </label>
            <p className="text-xs text-zinc-500 max-w-[150px]">
              Audio is processed locally in your browser.
            </p>
          </div>
        }
      </motion.div>
    </>);

}
