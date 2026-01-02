import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface IntroOverlayProps {
  onFinish: () => void;
  enableSounds?: boolean;
}

const TITLE_TEXT = 'SL2 Calculator Suite';
const TARGET_TEXT = 'Initializing systems [ SL2 Calculator ]';
const LOADING_STEPS = [
  'Loading SL2 assets…',
  'Assembling Youkai… (avoid eye contact)',
  'Balancing classes… actually, let’s not',
  'Crunching critical rates… ouch',
  'Calibrating APT… 36? 42? 80??',
  'Applying soft caps…',
  'Creating cookies… please don’t eat them',
  'Sharpening swords… don’t eat these either',
  'Feeding Bear… he’s beary apprceciative',
  'Summoning dagger buffs… hold onto your GUI',
];

export default function IntroOverlay({ onFinish, enableSounds = true }: IntroOverlayProps) {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [doneTyping, setDoneTyping] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rememberNext, setRememberNext] = useState(false);
  const typingIntervalRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const stepIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const beep = () => {
    if (!enableSounds) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 660 + Math.random() * 120; // retro-ish
      gain.gain.value = 0.02; // very quiet
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 80);
    } catch {}
  };

  useEffect(() => {
    // Typewriter effect
    let idx = 0;
    typingIntervalRef.current = window.setInterval(() => {
      setText(TARGET_TEXT.slice(0, idx + 1));
      idx++;
      if (idx >= TARGET_TEXT.length && typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setDoneTyping(true);
      }
    }, 20);

    // Progress effect
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => Math.min(100, prev + 2));
    }, 60);

    // Loading steps cycle + beep
    stepIntervalRef.current = window.setInterval(() => {
      setStepIndex(prev => {
        const next = (prev + 1) % LOADING_STEPS.length;
        beep();
        return next;
      });
    }, 600);

    // Enter to skip
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') finish();
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      if (typingIntervalRef.current) window.clearInterval(typingIntervalRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      if (stepIntervalRef.current) window.clearInterval(stepIntervalRef.current);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  const finish = () => {
    try {
      if (rememberNext) localStorage.setItem('sl2_skip_intro', '1');
    } catch {}
    onFinish();
  };

  useEffect(() => {
    if (progress >= 100 && doneTyping) {
      const t = setTimeout(finish, 600);
      return () => clearTimeout(t);
    }
  }, [progress, doneTyping]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 glass-effect" />
      <div className="absolute inset-0 crt-overlay" />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glitch font-retro text-lg sm:text-xl md:text-2xl mb-2"
          data-text={TITLE_TEXT}
        >
          {TITLE_TEXT}
        </motion.h1>

        <div className="text-sm sm:text-base text-gray-300 mb-4">
          {text}
        </div>

        <div className="text-xs text-gray-400 mb-6">
          {LOADING_STEPS[stepIndex]}
        </div>

        <div className="w-full h-2 bg-dark-700 rounded overflow-hidden mb-3 glow-border">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-6">
          {progress}% COMPLETE
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="text-xs text-gray-500">Press Enter to skip</div>
        </div>
      </div>
    </motion.div>
  );
}
