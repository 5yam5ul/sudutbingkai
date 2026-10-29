'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';

interface VoiceWaveformPlayerProps {
  audioUrl: string;
  guestName?: string;
  duration?: number;
}

export default function VoiceWaveformPlayer({
  audioUrl,
  guestName,
  duration
}: VoiceWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let ws: WaveSurfer | null = null;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(194, 120, 3, 0.28)',
        progressColor: '#C27803',
        cursorColor: '#C27803',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 40,
        normalize: true,
        url: audioUrl
      });

      wavesurferRef.current = ws;

      ws.on('ready', () => {
        setIsReady(true);
        setTotalDuration(Math.round(ws?.getDuration() || duration || 0));
      });

      ws.on('timeupdate', (time) => {
        setCurrentTime(Math.floor(time));
      });

      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      ws.on('error', (err) => {
        console.warn('WaveSurfer error, using audio fallback:', err);
        setHasError(true);
      });
    } catch {
      setHasError(true);
    }

    return () => {
      try {
        ws?.destroy();
      } catch {}
      wavesurferRef.current = null;
    };
  }, [audioUrl, duration]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;
    try {
      wavesurferRef.current.playPause();
    } catch {
      setIsPlaying(!isPlaying);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className="w-full">
        <audio controls src={audioUrl} className="w-full h-9 rounded-lg" />
      </div>
    );
  }

  return (
    <div 
      className="w-full rounded-2xl p-3 flex items-center gap-3 transition-all"
      style={{
        background: 'rgba(255, 255, 255, 0.65)',
        border: '1px solid rgba(194, 120, 3, 0.18)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}
    >
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!isReady}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 disabled:opacity-50"
        style={{
          background: '#C27803',
          color: '#FFFFFF',
          boxShadow: '0 2px 10px rgba(194, 120, 3, 0.35)'
        }}
        aria-label={isPlaying ? 'Jeda pesan suara' : 'Putar pesan suara'}
        title={isPlaying ? 'Jeda' : 'Putar'}
      >
        {isPlaying ? <Pause size={16} fill="#FFFFFF" /> : <Play size={16} fill="#FFFFFF" className="ml-0.5" />}
      </button>

      {/* Waveform & Duration */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div ref={containerRef} className="w-full" />
        <div className="flex items-center justify-between text-[11px] font-mono mt-1" style={{ color: '#86868B' }}>
          <span>{formatSec(currentTime)}</span>
          <span>{formatSec(totalDuration || 15)}</span>
        </div>
      </div>
    </div>
  );
}
