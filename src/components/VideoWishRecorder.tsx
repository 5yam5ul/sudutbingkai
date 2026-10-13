'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Video, Square, RefreshCw, Send, CheckCircle2, X, Volume2, Camera, MessageSquare, Check } from 'lucide-react';
import { getSupportedVideoMimeType, playCountdownBeep, generateVideoThumbnail } from '@/lib/videoRecorder';
import { toast } from 'sonner';

interface VideoWishRecorderProps {
  eventId: string;
  guestName: string;
  coupleOrHost: string;
  onSuccess: () => void;
  onSkipTextWish?: (textWish: string) => void;
}

export default function VideoWishRecorder({
  eventId,
  guestName,
  coupleOrHost,
  onSuccess,
  onSkipTextWish
}: VideoWishRecorderProps) {
  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isShyTextMode, setIsShyTextMode] = useState(false);
  const [textWish, setTextWish] = useState('');

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const MAX_DURATION = 15; // 15 seconds

  // Initialize camera
  useEffect(() => {
    let active = true;

    async function startCamera() {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 720 },
            height: { ideal: 1280 }
          },
          audio: true
        });

        if (!active) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        setStream(mediaStream);
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = mediaStream;
          liveVideoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn('Error starting camera for video wish:', err);
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (!active) {
            fallback.getTracks().forEach(t => t.stop());
            return;
          }
          setStream(fallback);
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = fallback;
            liveVideoRef.current.play().catch(() => {});
          }
        } catch (e) {
          setCameraError('Izinkan akses kamera dan mikrofon di browser ponsel Anda untuk merekam video ucapan.');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [facingMode]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  // Start 3-2-1 Countdown
  const handleStartCountdown = () => {
    if (!stream) return;
    setCountdown(3);
    playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playCountdownBeep(false);
      } else {
        clearInterval(interval);
        setCountdown(null);
        playCountdownBeep(true);
        startActualRecording();
      }
    }, 1000);
  };

  // Start Recording
  const startActualRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];

    const mimeType = getSupportedVideoMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm'
        });
        setRecordedBlob(finalBlob);
        setPreviewVideoUrl(URL.createObjectURL(finalBlob));
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      recorder.start(500); // 500ms timeslices for smooth capture
      setIsRecording(true);
      setRecordSeconds(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordSeconds(elapsed);

        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 200);
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      toast.error('Perangkat Anda tidak mendukung perekaman video di browser ini.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleRetake = () => {
    if (previewVideoUrl) {
      URL.revokeObjectURL(previewVideoUrl);
    }
    setRecordedBlob(null);
    setPreviewVideoUrl(null);
    setRecordSeconds(0);
    setIsRecording(false);

    // Reattach stream to live video
    setTimeout(() => {
      if (liveVideoRef.current && stream) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleSubmitVideo = async () => {
    if (!recordedBlob) return;
    setIsSubmitting(true);

    try {
      const thumbnail = await generateVideoThumbnail(recordedBlob);

      const formData = new FormData();
      formData.append('video', recordedBlob, `wish_${eventId}_${Date.now()}.webm`);
      formData.append('eventId', eventId);
      formData.append('guestName', guestName);
      if (thumbnail) formData.append('thumbnail', thumbnail);
      formData.append('duration', String(Math.max(1, recordSeconds)));

      const res = await fetch('/api/video-wishes', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Video ucapan 15 detik Anda berhasil dikirim untuk ${coupleOrHost}!`);
        if (stream) stream.getTracks().forEach(t => t.stop());
        onSuccess();
      } else {
        toast.error(data.error || 'Gagal mengunggah video ucapan.');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan saat mengunggah video.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitShyText = () => {
    if (!textWish.trim()) {
      toast.error('Tuliskan doa ucapan Anda terlebih dahulu.');
      return;
    }
    if (onSkipTextWish) {
      onSkipTextWish(textWish.trim());
    } else {
      toast.success('Doa ucapan Anda berhasil disimpan!');
      onSuccess();
    }
  };

  const progressPercent = Math.min(100, (recordSeconds / MAX_DURATION) * 100);

  return (
    <div style={{
      background: 'rgba(15, 14, 13, 0.96)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '24px',
      padding: '20px 18px',
      maxWidth: '360px',
      width: '100%',
      color: '#FFFFFF',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Camcorder Viewfinder Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isRecording ? '#EF4444' : '#10B981',
            display: 'inline-block',
            animation: isRecording ? 'pulse 1s infinite' : 'none'
          }} />
          <strong style={{ color: isRecording ? '#EF4444' : '#C27803' }}>
            {isRecording ? '● REC' : 'STBY'} 00:{String(recordSeconds).padStart(2, '0')} / 00:15
          </strong>
        </div>

        <span style={{ color: '#86868B', textTransform: 'uppercase' }}>
          [SP] CAMCORDER
        </span>
      </div>

      {/* Main Viewfinder Screen (9:16 Aspect Ratio) */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9/16',
        maxHeight: '380px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#000000',
        marginBottom: '14px',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        {/* Live Video Preview (when recording or standby) */}
        {!previewVideoUrl ? (
          <video
            ref={liveVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
            }}
          />
        ) : (
          /* Recorded Playback Review */
          <video
            src={previewVideoUrl}
            autoPlay
            playsInline
            controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Vintage Camcorder HUD Overlay Over Video */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top Vintage Watermark */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '9.5px', fontFamily: 'var(--font-mono)', textShadow: '0 1px 3px rgba(0,0,0,0.8)', color: 'rgba(255,255,255,0.85)' }}>
            <span>WEDDING OF {coupleOrHost.toUpperCase()}</span>
            <span>KODAK 400</span>
          </div>

          {/* Viewfinder Center Crosshair corners */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.35 }}>
            <div style={{ width: '32px', height: '32px', borderLeft: '1px solid #FFF', borderTop: '1px solid #FFF', position: 'absolute', top: '-16px', left: '-16px' }} />
            <div style={{ width: '32px', height: '32px', borderRight: '1px solid #FFF', borderBottom: '1px solid #FFF', position: 'absolute', bottom: '-16px', right: '-16px' }} />
          </div>

          {/* Bottom Overlay Label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '10px', fontFamily: 'var(--font-mono)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            <span>TAMU: {guestName.toUpperCase()}</span>
            <span>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
          </div>
        </div>

        {/* Big Energetic Countdown Overlay */}
        {countdown !== null && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 10
          }}>
            <span className="font-display-serif" style={{ fontSize: '72px', color: '#F59E0B', fontWeight: 900, lineHeight: 1 }}>
              {countdown}
            </span>
            <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 600, marginTop: '8px' }}>
              Bersiap & Tersenyum!
            </span>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={36} color="#EF4444" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '12px', color: '#FCA5A5', margin: 0 }}>{cameraError}</p>
          </div>
        )}
      </div>

      {/* Shy Mode (Text Fallback Drawer) */}
      {isShyTextMode ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706' }}>Tuliskan Doa & Ucapan Anda</span>
            <button onClick={() => setIsShyTextMode(false)} style={{ background: 'none', border: 'none', color: '#86868B', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <X size={12} />
              <span>Batal</span>
            </button>
          </div>
          <textarea
            rows={3}
            placeholder={`Selamat menempuh hidup baru ${coupleOrHost}, semoga sakinah mawaddah warahmah...`}
            value={textWish}
            onChange={(e) => setTextWish(e.target.value)}
            className="glass-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '10px', color: '#FFFFFF' }}
          />
          <button
            onClick={handleSubmitShyText}
            className="btn-apple-black"
            style={{ width: '100%', padding: '10px', fontSize: '12.5px', borderRadius: '10px' }}
          >
            Kirim Ucapan Teks Saja
          </button>
        </div>
      ) : (
        /* Action Controls */
        <div>
          {!previewVideoUrl ? (
            <div>
              {!isRecording ? (
                <div>
                  <button
                    onClick={handleStartCountdown}
                    disabled={countdown !== null || !!cameraError}
                    style={{
                      background: '#C27803',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '12px 24px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 18px rgba(194, 120, 3, 0.4)',
                      marginBottom: '8px'
                    }}
                  >
                    <Video size={16} />
                    <span>Mulai Rekam Ucapan (15s)</span>
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                    <button
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      style={{ background: 'none', border: 'none', color: '#A1A1A6', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Balik Kamera ({facingMode === 'user' ? 'Depan' : 'Belakang'})
                    </button>

                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>

                    <button
                      onClick={() => setIsShyTextMode(true)}
                      style={{ background: 'none', border: 'none', color: '#A1A1A6', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Malu merekam video? Ketik doa
                    </button>
                  </div>
                </div>
              ) : (
                /* Recording Active Controller with Circular SVG Ring */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#EF4444"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={175.9}
                        strokeDashoffset={175.9 - (175.9 * progressPercent) / 100}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.2s linear' }}
                      />
                    </svg>

                    <button
                      onClick={stopRecording}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 0 16px rgba(239, 68, 68, 0.6)'
                      }}
                      title="Selesai Rekam"
                    >
                      <Square size={16} fill="#FFFFFF" />
                    </button>
                  </div>

                  <span style={{ fontSize: '12px', color: '#F87171', animation: 'pulse 1s infinite' }}>
                    ● Sedang merekam video ({recordSeconds}s / 15s)...
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Review & Submit Actions */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: '#4ADE80', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} color="#4ADE80" strokeWidth={2.5} />
                <span>Rekaman video selesai ({recordSeconds} detik)</span>
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSubmitVideo}
                  disabled={isSubmitting}
                  className="btn-apple-black"
                  style={{
                    flex: 1,
                    padding: '11px',
                    fontSize: '13px',
                    background: '#C27803',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Mengunggah Video...' : 'Kirim Video Ucapan'}</span>
                </button>

                <button
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="glass-pill"
                  style={{ padding: '11px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} />
                  <span>Ulangi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
