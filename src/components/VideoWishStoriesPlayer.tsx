'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Download, Heart, Play, Pause } from 'lucide-react';
import { VideoWishRecord } from '@/lib/types';

interface VideoWishStoriesPlayerProps {
  wishes: VideoWishRecord[];
  initialIndex?: number;
  coupleOrHost: string;
  onClose: () => void;
}

export default function VideoWishStoriesPlayer({
  wishes,
  initialIndex = 0,
  coupleOrHost,
  onClose
}: VideoWishStoriesPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentWish = wishes[currentIndex];

  // Auto-play and progress tracking
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setProgress(0);
    videoRef.current.play().catch(() => {});
  }, [currentIndex]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || currentWish?.durationSeconds || 15;
    const cur = videoRef.current.currentTime || 0;
    setProgress((cur / dur) * 100);
  };

  const handleVideoEnded = () => {
    if (currentIndex < wishes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < wishes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  if (!currentWish || wishes.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 120,
      background: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Container (Vertical 9:16 mobile frame on desktop) */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        height: '100%',
        maxHeight: '92vh',
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#111',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
      }}>
        {/* Top Segmented Progress Bar (like Instagram Stories) */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 20,
          display: 'flex',
          gap: '4px'
        }}>
          {wishes.map((_, idx) => {
            let widthPercent = 0;
            if (idx < currentIndex) widthPercent = 100;
            else if (idx === currentIndex) widthPercent = progress;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: '3px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  height: '100%',
                  width: `${widthPercent}%`,
                  background: '#FFFFFF',
                  transition: idx === currentIndex ? 'width 0.15s linear' : 'none'
                }} />
              </div>
            );
          })}
        </div>

        {/* Top Header Controls */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '14px',
          right: '14px',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#FFFFFF'
        }}>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {currentWish.guestName}
            </strong>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {currentWish.tableNumber ? `Meja ${currentWish.tableNumber} • ` : ''}Video Ucapan ({currentIndex + 1} dari {wishes.length})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <a
              href={currentWish.videoUrl}
              download={`video-ucapan-${currentWish.guestName}.webm`}
              style={{ background: 'rgba(0,0,0,0.5)', color: '#FFF', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              title="Unduh Video"
            >
              <Download size={16} />
            </a>

            <button
              onClick={onClose}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          src={currentWish.videoUrl}
          autoPlay
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
          onClick={togglePlayPause}
        />

        {/* Play/Pause Indicator Overlay */}
        {isPaused && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <Play size={28} fill="#FFF" style={{ marginLeft: '4px' }} />
            </div>
          </div>
        )}

        {/* Tap Hotspots: Left Half (Previous) & Right Half (Next) */}
        <div
          onClick={handlePrev}
          style={{
            position: 'absolute',
            left: 0,
            top: '60px',
            bottom: '80px',
            width: '35%',
            zIndex: 10,
            cursor: 'pointer'
          }}
        />
        <div
          onClick={handleNext}
          style={{
            position: 'absolute',
            right: 0,
            top: '60px',
            bottom: '80px',
            width: '65%',
            zIndex: 10,
            cursor: 'pointer'
          }}
        />

        {/* Bottom Vintage Footer Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 18px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          color: '#FFFFFF',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#C27803', fontFamily: 'var(--font-mono)' }}>
              SPECIAL VIDEO GUESTBOOK
            </span>
            <h4 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>
              {coupleOrHost}
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', borderRadius: '999px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} />
                <span>Sebelumnya</span>
              </button>
            )}

            {currentIndex < wishes.length - 1 ? (
              <button
                onClick={handleNext}
                style={{ background: '#C27803', border: 'none', color: '#FFF', borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Lanjut</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{ background: '#10B981', border: 'none', color: '#FFF', borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
