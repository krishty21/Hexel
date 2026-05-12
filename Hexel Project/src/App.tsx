import { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { HexCanvas } from './components/HexCanvas';
import { ImageImportModal } from './components/ImageImportModal';
import { ModeSelector } from './components/ModeSelector';
import { Toolbar } from './components/Toolbar';
import { AnimatePresence } from 'framer-motion';

type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function App() {
  const activeMode = useStore((s) => s.activeMode);
  // Web Audio API State
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Cleanup audio on unmount or mode change
  useEffect(() => {
    if (activeMode !== 'audio' && audioRef.current) {
      audioRef.current.pause();
    }
  }, [activeMode]);
  const handleAudioUpload = async (file: File) => {
    // Create audio context if it doesn't exist
    let actx = audioContext;
    if (!actx) {
      const audioWindow = window as AudioContextWindow;
      const AudioContextCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextCtor) return;
      actx = new AudioContextCtor();
      setAudioContext(actx);
    }
    // Create analyser
     let anl = analyser;
     if (!anl) {
       anl = actx.createAnalyser();
       anl.fftSize = 512;
       setAnalyser(anl);
     }
    // Create object URL for the file
    const url = URL.createObjectURL(file);
    // Setup audio element
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      // Connect audio element to analyser and destination
      const source = actx.createMediaElementSource(audio);
      source.connect(anl);
      anl.connect(actx.destination);
    }
    audioRef.current.src = url;
    // Resume context (required by browsers)
    if (actx.state === 'suspended') {
      await actx.resume();
    }
    audioRef.current.play();
  };
  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans select-none">
      {/* Core Canvas Engine (always mounted, renders based on mode) */}
      <HexCanvas audioAnalyser={analyser || undefined} />

      {/* UI Layer */}
      <AnimatePresence>
        {activeMode === 'menu' && <ModeSelector onImageUpload={setImageFile} />}
      </AnimatePresence>

      <Toolbar onAudioUpload={handleAudioUpload} onImageUpload={setImageFile} />
      {imageFile && <ImageImportModal file={imageFile} onClose={() => setImageFile(null)} />}
    </div>);

}
