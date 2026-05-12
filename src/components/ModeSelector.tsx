import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useStore, Mode } from '../store';
import { ImagePlus, Keyboard, MousePointer2, Music, Pickaxe } from 'lucide-react';
const modes: {
  id: Mode | 'image';
  title: string;
  desc: string;
  icon: ReactNode;
  color: string;
}[] = [
{
  id: 'sculpt',
  title: 'Sculpt',
  desc: 'Paint and stack 3D isometric blocks with advanced materials.',
  icon: <Pickaxe size={32} />,
  color: 'from-blue-500 to-cyan-500'
},
{
  id: 'hover',
  title: 'Hover Garden',
  desc: 'Interactive elements that react organically to your cursor.',
  icon: <MousePointer2 size={32} />,
  color: 'from-green-500 to-emerald-500'
},
{
  id: 'type',
  title: 'Type Waves',
  desc: 'Keyboard strokes generate elegant interference patterns.',
  icon: <Keyboard size={32} />,
  color: 'from-purple-500 to-pink-500'
},
{
  id: 'image',
  title: 'Image Forge',
  desc: 'Upload an image and rebuild it as a deep colored hex relief.',
  icon: <ImagePlus size={32} />,
  color: 'from-cyan-500 to-blue-500'
},
{
  id: 'audio',
  title: 'Audio Pulse',
  desc: 'Upload music to see the grid react to frequencies.',
  icon: <Music size={32} />,
  color: 'from-orange-500 to-red-500'
}];

export function ModeSelector({ onImageUpload }: { onImageUpload?: (file: File) => void }) {
  const setActiveMode = useStore((s) => s.setActiveMode);
  const stopCanvasEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  return (
    <motion.div
      initial={{
        opacity: 0
      }}
      animate={{
        opacity: 1
      }}
      exit={{
        opacity: 0
      }}
      onPointerDownCapture={stopCanvasEvent}
      onPointerUpCapture={stopCanvasEvent}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] p-8">
      
      <div className="text-center mb-12">
        <h1
          className="text-5xl font-bold text-white tracking-tighter mb-4"
          style={{
            fontFamily: 'monospace'
          }}>
          
          HEX FORGE
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          A playful open canvas for building strange little hex worlds. Pick a mode and enjoy it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {modes.map((mode, i) =>
        <motion.button
          key={mode.id}
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: i * 0.1
          }}
          onClick={() => {
            if (mode.id !== 'image') setActiveMode(mode.id);
          }}
          className="group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-left hover:border-zinc-600 transition-colors">
          
            <div
            className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${mode.color} transition-opacity duration-500`} />
          

            <div
            className={`w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-500`}>
            
              {mode.icon}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{mode.title}</h2>
            <p className="text-zinc-400">{mode.desc}</p>
            {mode.id === 'image' &&
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onImageUpload) onImageUpload(file);
                  event.currentTarget.value = '';
                }}
              />
            }
          </motion.button>
        )}
      </div>
    </motion.div>);

}
