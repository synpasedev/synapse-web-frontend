'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Plus, BellRing, Sparkles } from 'lucide-react';

export const FigJamTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 mins default
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  const toggleRun = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(180);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
      setIsFinished(false);
    }
  };

  const handleReset = (newSecs = 180) => {
    setIsRunning(false);
    setSecondsLeft(newSecs);
    setIsFinished(false);
  };

  const addOneMinute = () => {
    setSecondsLeft((prev) => prev + 60);
    setIsFinished(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative select-none">
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isFinished
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
            : isRunning
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent'
        }`}
        title="Brainstorming Timer"
      >
        {isFinished ? (
          <BellRing className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
        ) : (
          <Timer className={`w-3.5 h-3.5 ${isRunning ? 'text-indigo-400 animate-spin' : ''}`} />
        )}
        <span className="font-mono text-xs">{formatTime(secondsLeft)}</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute top-11 right-0 z-50 w-64 p-3.5 rounded-2xl bg-[#181922]/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Timer className="w-4 h-4 text-indigo-400" />
              <span>FigJam Brainstorm Timer</span>
            </div>
            {isFinished && (
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider animate-pulse">
                Time&apos;s Up!
              </span>
            )}
          </div>

          {/* Big Time Display */}
          <div
            className={`py-3 text-center rounded-xl border mb-3 transition-colors ${
              isFinished
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : isRunning
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-secondary/30 border-border/40 text-foreground'
            }`}
          >
            <span className="font-mono text-3xl font-black tracking-widest">
              {formatTime(secondsLeft)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              type="button"
              onClick={toggleRun}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={addOneMinute}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/50 transition-colors cursor-pointer"
              title="Add 1 minute"
            >
              <Plus className="w-3 h-3" />
              <span>1m</span>
            </button>

            <button
              type="button"
              onClick={() => handleReset(180)}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Reset to 3m"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => handleReset(60)}
              className="flex-1 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              1 min
            </button>
            <button
              type="button"
              onClick={() => handleReset(180)}
              className="flex-1 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              3 min
            </button>
            <button
              type="button"
              onClick={() => handleReset(300)}
              className="flex-1 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              5 min
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
