'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Zap, RotateCcw, ArrowLeft, ArrowRight, Camera, QrCode as QrIcon, 
  Check, Eye, Download, X, Heart, MessageSquare, CheckCircle2, Film,
  Share2, Sparkles, Layers, Mic, MicOff, Play, Square, WifiOff,
  Image as ImageIcon, AlertTriangle, Upload
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { EventData, FilmPresetId } from '@/lib/types';
import { FILM_PRESETS, applyAnalogFilterToCanvas } from '@/lib/filters';
import { playAnalogShutterSound, playFilmWindingSound } from '@/lib/audio';
import { 
  hapticShutterPress, 
  hapticShutterSlap, 
  hapticDialClick, 
  hapticToggle, 
  hapticDoubleTick, 
  hapticLightTap 
} from '@/lib/haptics';
import { FRAME_TEMPLATES, FrameId, applyFrameToCanvas } from '@/lib/frames';
import { addPhotoToOfflineQueue, flushOfflineQueue, getOfflinePhotosQueue } from '@/lib/offlineQueue';

interface GuestPhoto {
  id: string;
  shotNumber: number;
  imageData: string;
  timestamp: string;
  caption?: string;
  aspectRatio?: '1:1' | '3:4' | '9:16';
  frameId?: FrameId;
}

export default function GuestCameraPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [guestName, setGuestName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  // Point 3: Flash modes: 'screen' (white screen strobe) | 'torch' (LED back hardware light) | 'off'
  const [flashMode, setFlashMode] = useState<'screen' | 'torch' | 'off'>('screen');
  
  // Point 8: Multi-Aspect Ratio: '3:4' | '1:1' | '9:16'
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '9:16'>('3:4');

  // Point 1: Frame toggle (guest can choose framed vs raw)
  const [useFrame, setUseFrame] = useState(true);

  // Analog Film Preset Selection (defaults to event preset, switchable if host allows)
  const [selectedPreset, setSelectedPreset] = useState<FilmPresetId>('portra');

  // Point 5: Offline queue status
  const [offlineCount, setOfflineCount] = useState(0);

  const [shotCount, setShotCount] = useState(0);
  const [maxShots, setMaxShots] = useState(20);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDesktop, setIsDesktop] = useState(false);

  const [eventNotFound, setEventNotFound] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Guest Personal Roll States
  const [myPhotos, setMyPhotos] = useState<GuestPhoto[]>([]);
  const [lastShotThumb, setLastShotThumb] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showRollModal, setShowRollModal] = useState(false);
  const [showWishModal, setShowWishModal] = useState(false);
  const [currentWish, setCurrentWish] = useState('');
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Point 6: Voice Note Recording States (at Quota Exhausted)
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [hasSentVoice, setHasSentVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect desktop screen width for studio preview layout
  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 880);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Fetch event data & handle offline sync listener
  useEffect(() => {
    fetch(`/api/events?id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.event) {
          setEvent(data.event);
          setMaxShots(data.event.shotsPerGuest || 20);
          if (data.event.preset) {
            setSelectedPreset(data.event.preset);
          }
          if (data.event.frameId === 'none') {
            setUseFrame(false);
          }
        } else {
          setEventNotFound(true);
        }
      })
      .catch(() => setEventNotFound(true))
      .finally(() => setLoadingEvent(false));

    try {
      const savedName = localStorage.getItem(`sb_guest_${eventId}`);
      if (savedName) {
        setGuestName(savedName);
        setHasEnteredName(true);
      }
      const savedTable = localStorage.getItem(`sb_table_${eventId}`);
      if (savedTable) {
        setTableNumber(savedTable);
      }
      const savedPhotos = localStorage.getItem(`sb_my_shots_${eventId}`);
      if (savedPhotos) {
        const parsed = JSON.parse(savedPhotos);
        setMyPhotos(parsed);
        setShotCount(parsed.length);
        if (parsed.length > 0) {
          setLastShotThumb(parsed[parsed.length - 1].imageData);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Check offline queue
    getOfflinePhotosQueue(eventId).then(queue => {
      setOfflineCount(queue.length);
    });

    const handleOnline = () => {
      flushOfflineQueue(() => {
        setOfflineCount(prev => Math.max(0, prev - 1));
      }).then(count => {
        if (count > 0) {
          toast.success(`${count} foto offline berhasil disinkronkan ke album!`);
        }
      });
    };

    window.addEventListener('online', handleOnline);

    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        color: { dark: '#1D1D1F', light: '#FFFFFF' }
      }).then(setQrDataUrl);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [eventId]);

  const startCamera = async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallback;
        if (videoRef.current) {
          videoRef.current.srcObject = fallback;
          await videoRef.current.play();
        }
      } catch (fErr) {
        setCameraError('Izinkan akses kamera di browser ponsel Anda untuk memotret.');
      }
    }
  };

  useEffect(() => {
    if (hasEnteredName) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [hasEnteredName, facingMode]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    localStorage.setItem(`sb_guest_${eventId}`, guestName.trim());
    if (tableNumber.trim()) {
      localStorage.setItem(`sb_table_${eventId}`, tableNumber.trim());
    }
    setHasEnteredName(true);
    toast.success(`Selamat datang, ${guestName.trim()}! Kamera siap digunakan.`);
  };

  const flipCamera = () => {
    hapticToggle();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Point 8: Cycle Aspect Ratios
  const cycleAspectRatio = () => {
    hapticDialClick();
    if (aspectRatio === '3:4') setAspectRatio('1:1');
    else if (aspectRatio === '1:1') setAspectRatio('9:16');
    else setAspectRatio('3:4');
  };

  // Point 3: Cycle Flash Modes
  const cycleFlashMode = () => {
    hapticDoubleTick();
    if (flashMode === 'screen') setFlashMode('torch');
    else if (flashMode === 'torch') setFlashMode('off');
    else setFlashMode('screen');
  };

  // Core Image Processing & Cloud/Offline Roll Sync
  const processAndUploadImage = async (
    source: HTMLVideoElement | HTMLImageElement,
    isMirroredUserFacing: boolean = false
  ) => {
    if (shotCount >= maxShots) {
      toast.error('Jatah roll foto Anda sudah habis.');
      return;
    }
    setIsCapturing(true);

    // Audio effects: Shutter click + mechanical film winding ratchet
    playAnalogShutterSound();
    playFilmWindingSound();

    // Haptic feedback (hentakan rana mekanik analog)
    hapticShutterSlap();

    const canvas = canvasRef.current || document.createElement('canvas');

    // Multi-Aspect Ratio: '3:4' | '1:1' | '9:16'
    const targetAspect = aspectRatio === '1:1' ? 1 : aspectRatio === '9:16' ? 9 / 16 : 3 / 4;
    canvas.width = 1200;
    canvas.height = Math.round(1200 / targetAspect);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const isVideo = source instanceof HTMLVideoElement;
      const sW = isVideo ? source.videoWidth || 640 : source.naturalWidth || 640;
      const sH = isVideo ? source.videoHeight || 480 : source.naturalHeight || 480;
      const sourceRatio = sW / sH;
      let cW, cH, sX, sY;

      if (sourceRatio > targetAspect) {
        cH = sH;
        cW = sH * targetAspect;
        sX = (sW - cW) / 2;
        sY = 0;
      } else {
        cW = sW;
        cH = sW / targetAspect;
        sX = 0;
        sY = (sH - cH) / 2;
      }

      if (isMirroredUserFacing) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(source, sX, sY, cW, cH, 0, 0, canvas.width, canvas.height);

      if (isMirroredUserFacing) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // 1. Apply analog color emulations & date stamp
      const currentPreset = selectedPreset || event?.preset || 'portra';
      applyAnalogFilterToCanvas(canvas, ctx, currentPreset, true);

      // 2. Point 1: Apply decorative event frame if enabled
      const activeFrameId = (useFrame && event?.frameId) ? event.frameId : 'none';
      if (activeFrameId !== 'none') {
        await applyFrameToCanvas(canvas, ctx, {
          frameId: activeFrameId,
          coupleOrTitle: event?.coupleOrHost || 'Pernikahan Spesial',
          eventDate: event?.eventDate,
          tagline: event?.frameText,
          customFrameUrl: event?.customFrameUrl
        });
      }

      const base64 = canvas.toDataURL('image/jpeg', 0.90);
      const newShotNum = shotCount + 1;
      setShotCount(newShotNum);

      // Create lightweight thumbnail for instant preview & safe localStorage storage
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 180;
      thumbCanvas.height = Math.round(180 / targetAspect);
      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbBase64 = thumbCanvas.toDataURL('image/jpeg', 0.65);
      setLastShotThumb(thumbBase64);

      // Save lightweight thumbnail locally to guest personal roll
      const newGuestPhoto: GuestPhoto = {
        id: 'shot-' + Date.now(),
        shotNumber: newShotNum,
        imageData: thumbBase64,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        caption: currentWish.trim() || (tableNumber ? `Meja ${tableNumber}` : ''),
        aspectRatio,
        frameId: activeFrameId
      };

      const updatedShots = [...myPhotos, newGuestPhoto];
      setMyPhotos(updatedShots);
      try {
        localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(updatedShots));
      } catch (err) {
        console.warn('LocalStorage quota limit reached, saving in memory:', err);
      }

      // Trigger polaroid pop feedback
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);

      // Point 5: Send high-res photo to server or store in offline queue if offline
      const displayName = tableNumber ? `${guestName} (${tableNumber})` : guestName;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addPhotoToOfflineQueue({
          id: newGuestPhoto.id,
          eventId,
          guestName: displayName,
          shotNumber: newShotNum,
          imageData: base64,
          caption: currentWish.trim(),
          aspectRatio,
          frameId: activeFrameId,
          createdAt: Date.now()
        }).then(() => {
          setOfflineCount(prev => prev + 1);
          toast.info('Tersimpan di antrian offline HP. Otomatis terunggah saat online.');
        });
      } else {
        fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            guestName: displayName,
            shotNumber: newShotNum,
            imageData: base64,
            caption: currentWish.trim(),
            aspectRatio,
            frameId: activeFrameId
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.photo?.imageData) {
            setMyPhotos(prev => prev.map(p => p.id === newGuestPhoto.id ? { ...p, imageData: data.photo.imageData } : p));
          }
        })
        .catch(async () => {
          // Network dropped during upload, queue it safely in IndexedDB
          await addPhotoToOfflineQueue({
            id: newGuestPhoto.id,
            eventId,
            guestName: displayName,
            shotNumber: newShotNum,
            imageData: base64,
            caption: currentWish.trim(),
            aspectRatio,
            frameId: activeFrameId,
            createdAt: Date.now()
          });
          setOfflineCount(prev => prev + 1);
          toast.info('Koneksi terputus. Foto disimpan di memori HP.');
        });
      }

      // Reset wish input
      setCurrentWish('');
    }

    setTimeout(() => {
      setIsCapturing(false);
    }, 400);
  };

  const takePhoto = async () => {
    if (isCapturing || !videoRef.current || shotCount >= maxShots) return;

    // Point 3: Flash handling (Hardware Torch or Screen flash)
    if (flashMode === 'torch' && streamRef.current && facingMode === 'environment') {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        // @ts-ignore
        const capabilities = track.getCapabilities?.();
        // @ts-ignore
        if (capabilities?.torch) {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: true }] });
          setTimeout(() => {
            // @ts-ignore
            track.applyConstraints({ advanced: [{ torch: false }] });
          }, 350);
        } else {
          setFlashTrigger(true);
          setTimeout(() => setFlashTrigger(false), 220);
        }
      } catch {
        setFlashTrigger(true);
        setTimeout(() => setFlashTrigger(false), 220);
      }
    } else if (flashMode === 'screen') {
      setFlashTrigger(true);
      setTimeout(() => setFlashTrigger(false), 220);
    }

    await processAndUploadImage(videoRef.current, facingMode === 'user');
  };

  // Gallery Upload Fallback Handler
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = async () => {
          await processAndUploadImage(img, false);
          toast.success('Foto dari galeri HP berhasil diproses bernuansa analog!');
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const downloadSinglePhoto = (dataUrl: string, shotNum: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `SudutBingkai_${event?.title || 'Nikahan'}_Jepretan${shotNum}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Jepretan #${shotNum} tersimpan ke galeri Anda!`);
  };

  // Point 2: Native Web Share API
  const handleSharePhoto = async (photo: GuestPhoto) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        if (photo.imageData.startsWith('data:image')) {
          const res = await fetch(photo.imageData);
          const blob = await res.blob();
          const file = new File([blob], `SudutBingkai_${photo.shotNumber}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: event?.title || 'Foto SudutBingkai',
              text: `Momen seru di ${event?.title}!`,
              files: [file]
            });
            return;
          }
        }
        await navigator.share({
          title: event?.title || 'Foto SudutBingkai',
          text: `Momen seru di ${event?.title}!`,
          url: window.location.href
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Foto seru di ${event?.title}! ${window.location.href}`)}`, '_blank');
        }
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Foto seru di ${event?.title}! ${window.location.href}`)}`, '_blank');
    }
  };

  // Point 6: Voice Note Recording Functions
  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => {
          if (prev >= 15) {
            stopRecordingVoice();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error('Izinkan akses mikrofon untuk merekam pesan suara.');
    }
  };

  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const submitVoiceNote = async () => {
    if (!audioBlob) return;
    setIsUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('eventId', eventId);
      formData.append('guestName', guestName || 'Tamu');
      formData.append('duration', String(recordDuration));

      const res = await fetch('/api/voice-notes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setHasSentVoice(true);
        toast.success('Pesan suara dan doa Anda telah tersimpan untuk pengantin!');
      } else {
        toast.error('Gagal mengirim pesan: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const availablePresets: FilmPresetId[] = (event?.allowedPresets && event.allowedPresets.length > 0)
    ? event.allowedPresets
    : (['portra', 'funsaver', 'quicksnap', 'ektar', 'cinestill', 'ilford', 'agfa', 'trix'] as FilmPresetId[]);
  const presetInfo = FILM_PRESETS[selectedPreset] || (event ? FILM_PRESETS[event.preset] : FILM_PRESETS.portra) || FILM_PRESETS.portra;
  const remaining = Math.max(0, maxShots - shotCount);
  const activeFrameTemplate = event?.frameId ? FRAME_TEMPLATES[event.frameId] : FRAME_TEMPLATES['minimal-gold'];

  // Viewfinder inner component (Dedicated 3-Tier Analog Camera Chassis)
  const cameraViewfinder = (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#0D0C0A',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      color: '#fff',
      userSelect: 'none'
    }}>
      {/* Hidden File Input for Phone Gallery Upload Fallback */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryUpload}
        style={{ display: 'none' }}
      />

      {/* TIER 1: Dedicated Top Deck Hood (Flash, Film Preset, Counter) */}
      <header style={{
        flexShrink: 0,
        zIndex: 30,
        background: '#12110F',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(max(10px, env(safe-area-inset-top, 0px))) 16px 10px 16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Flash Mode Minimal Button */}
        <button
          onClick={cycleFlashMode}
          style={{
            background: flashMode !== 'off' ? 'rgba(194, 120, 3, 0.9)' : 'rgba(255, 255, 255, 0.1)',
            border: flashMode !== 'off' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.18)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: flashMode !== 'off' ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
          }}
          title={`Mode Kilat: ${flashMode.toUpperCase()}`}
        >
          <Zap size={16} fill={flashMode !== 'off' ? '#FFFFFF' : 'none'} color={flashMode !== 'off' ? '#FFF' : '#A1A1A6'} />
        </button>

        {/* Center Film Canister Pill */}
        <button
          onClick={() => {
            if (event?.allowGuestPresetSwitch && availablePresets.length > 1) {
              const currentIndex = availablePresets.indexOf(selectedPreset);
              const nextIndex = (currentIndex + 1) % availablePresets.length;
              const nextPreset = availablePresets[nextIndex];
              hapticDialClick();
              setSelectedPreset(nextPreset);
              toast.info(`Film: ${FILM_PRESETS[nextPreset]?.name || nextPreset}`);
            }
          }}
          disabled={!event?.allowGuestPresetSwitch || availablePresets.length <= 1}
          style={{
            background: '#1D1B18',
            border: event?.allowGuestPresetSwitch && availablePresets.length > 1 ? '1px solid rgba(194, 120, 3, 0.65)' : '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 14px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: '#FFFFFF',
            cursor: event?.allowGuestPresetSwitch && availablePresets.length > 1 ? 'pointer' : 'default',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
          }}
          title={event?.allowGuestPresetSwitch ? 'Ketuk untuk ganti film analog' : 'Emulasi film acara'}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: presetInfo.accentColor || '#C27803' }} />
          <span className="font-mono-film" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>
            {presetInfo.name.toUpperCase()}
          </span>
          {event?.allowGuestPresetSwitch && availablePresets.length > 1 && (
            <span style={{ fontSize: '10px', opacity: 0.75, color: '#C27803' }}>⇄</span>
          )}
        </button>

        {/* Right Mechanical Frame Counter Window */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {offlineCount > 0 && (
            <div style={{
              background: 'rgba(217, 119, 6, 0.25)',
              border: '1px solid #D97706',
              padding: '3px 7px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: '#F59E0B'
            }}>
              <WifiOff size={10} />
              <span>{offlineCount}</span>
            </div>
          )}

          <div style={{
            background: '#0B0A09',
            border: '1.5px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '8px',
            padding: '4px 9px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.7)'
          }}>
            <span style={{ fontSize: '8px', color: '#86868B', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>SISA</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13.5px',
              fontWeight: 800,
              color: remaining <= 3 ? '#FF6B6B' : '#F59E0B',
              lineHeight: 1.1,
              letterSpacing: '0.04em'
            }}>
              {remaining.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </header>

      {/* TIER 2: Central Clean Viewfinder Chamber (Zero buttons sitting on top!) */}
      <main style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '6px 12px',
        overflow: 'hidden',
        background: '#080706'
      }}>
        {/* The Viewfinder Box with exact aspect ratio matching output */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: aspectRatio === '1:1' ? 'min(88vw, 360px)' : aspectRatio === '9:16' ? 'min(72vw, 320px)' : 'min(88vw, 380px)',
          maxHeight: '100%',
          aspectRatio: aspectRatio === '1:1' ? '1/1' : aspectRatio === '9:16' ? '9/16' : '3/4',
          borderRadius: '18px',
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 12px 40px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
            }}
            className={`film-${selectedPreset || event?.preset || 'portra'}`}
          />

          {/* Delicate Viewfinder Corner Reticle (Strictly inside the box corners, unobtrusive) */}
          <div style={{
            position: 'absolute',
            inset: '10px',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ width: '10px', height: '10px', borderTop: '2px solid rgba(245, 158, 11, 0.8)', borderLeft: '2px solid rgba(245, 158, 11, 0.8)', borderTopLeftRadius: '2px' }} />
              <span style={{ width: '10px', height: '10px', borderTop: '2px solid rgba(245, 158, 11, 0.8)', borderRight: '2px solid rgba(245, 158, 11, 0.8)', borderTopRightRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ width: '10px', height: '10px', borderBottom: '2px solid rgba(245, 158, 11, 0.8)', borderLeft: '2px solid rgba(245, 158, 11, 0.8)', borderBottomLeftRadius: '2px' }} />
              <span style={{ width: '10px', height: '10px', borderBottom: '2px solid rgba(245, 158, 11, 0.8)', borderRight: '2px solid rgba(245, 158, 11, 0.8)', borderBottomRightRadius: '2px' }} />
            </div>
          </div>

          {/* Camera Permission / Error Fallback inside viewfinder */}
          {cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 35,
              background: 'rgba(11, 10, 9, 0.94)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(217, 119, 6, 0.15)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <AlertTriangle size={24} />
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                Izin Kamera Belum Aktif
              </h3>

              <p style={{ color: '#A1A1A6', fontSize: '12px', lineHeight: 1.4, maxWidth: '260px', marginBottom: '16px' }}>
                {cameraError} Anda tetap bisa memotret dengan memilih foto langsung dari Galeri HP:
              </p>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="btn-apple-black"
                style={{
                  background: '#C27803',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  boxShadow: '0 6px 20px rgba(194, 120, 3, 0.3)'
                }}
              >
                <ImageIcon size={15} />
                <span>Pilih dari Galeri HP</span>
              </button>

              <button
                onClick={startCamera}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#86868B',
                  fontSize: '11.5px',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Coba Buka Kamera Lagi
              </button>
            </div>
          )}

          {/* Shutter Flash Animation */}
          {flashTrigger && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#ffffff',
              zIndex: 90,
              opacity: 0.98,
              transition: 'opacity 0.22s ease-out'
            }} />
          )}

          {/* Animated Polaroid Spit-out Notification Banner */}
          <AnimatePresence>
            {showToast && lastShotThumb && (
              <motion.div
                initial={{ y: -40, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.92 }}
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                onClick={() => setShowRollModal(true)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  zIndex: 80,
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(20px)',
                  color: '#1D1D1F',
                  padding: '8px 12px',
                  borderRadius: '14px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '7px', overflow: 'hidden', background: '#000', flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }}>
                  <img src={lastShotThumb} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} color="#27AE60" />
                    <strong style={{ fontSize: '11.5px', color: '#1D1D1F' }}>Tersimpan ke Roll!</strong>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#6E6E73', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Ketuk untuk lihat foto ({myPhotos.length})
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* TIER 3: Solid Dark Camera Deck & Control Deck */}
      <footer style={{
        flexShrink: 0,
        zIndex: 30,
        background: '#12110F',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 16px calc(max(14px, env(safe-area-inset-bottom, 0px)) + 4px) 16px',
        gap: '12px',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Row 1: Secondary Controls Cluster (Just 2 clean, high-value pills) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%'
        }}>
          {/* Frame Toggle */}
          {event?.allowGuestFrameToggle !== false && (
            <button
              onClick={() => {
                hapticToggle();
                setUseFrame(!useFrame);
              }}
              style={{
                background: useFrame ? 'rgba(194, 120, 3, 0.9)' : 'rgba(255, 255, 255, 0.08)',
                border: useFrame ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.16)',
                padding: '6px 14px',
                borderRadius: '999px',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                boxShadow: useFrame ? '0 2px 8px rgba(194, 120, 3, 0.35)' : 'none'
              }}
              title="Pilih Pakai Bingkai atau Raw"
            >
              <Sparkles size={12} color={useFrame ? '#FFF' : '#F59E0B'} />
              <span>{useFrame ? 'BINGKAI' : 'RAW'}</span>
            </button>
          )}

          {/* Wish Trigger Button */}
          <button
            onClick={() => {
              hapticLightTap();
              setShowWishModal(true);
            }}
            style={{
              background: currentWish.trim() ? 'rgba(194, 120, 3, 0.9)' : 'rgba(255, 255, 255, 0.08)',
              border: currentWish.trim() ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.16)',
              padding: '6px 14px',
              borderRadius: '999px',
              color: '#FFFFFF',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              maxWidth: '160px',
              transition: 'all 0.2s ease',
              boxShadow: currentWish.trim() ? '0 2px 8px rgba(194, 120, 3, 0.35)' : 'none'
            }}
            title="Tuliskan ucapan untuk pengantin"
          >
            <Heart size={12} fill={currentWish.trim() ? 'currentColor' : 'none'} color={currentWish.trim() ? '#fff' : '#C27803'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentWish.trim() ? 'Tersimpan' : '+ Ucapan'}
            </span>
          </button>
        </div>

        {/* Row 2: Pure Symmetrical 3-Pillar Shutter Deck */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '340px',
          padding: '0 8px'
        }}>
          {/* Left Pillar: My Roll Preview (48x48px) */}
          <button
            onClick={() => {
              hapticLightTap();
              setShowRollModal(true);
            }}
            style={{
              background: '#1A1815',
              border: '1.5px solid rgba(255, 255, 255, 0.22)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            title="Buka Rol Foto Saya"
          >
            {lastShotThumb ? (
              <img src={lastShotThumb} alt="My Roll" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Film size={20} color="#FFFFFF" />
            )}
            {myPhotos.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#C27803',
                color: '#fff',
                fontSize: '9.5px',
                fontWeight: 700,
                minWidth: '17px',
                height: '17px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                border: '1.5px solid #12110F'
              }}>
                {myPhotos.length}
              </span>
            )}
          </button>

          {/* Center Pillar: Tactile Mechanical Shutter Ring (74x74px) */}
          <button
            onClick={takePhoto}
            onPointerDown={() => {
              if (!isCapturing && remaining > 0) {
                hapticShutterPress();
              }
            }}
            disabled={isCapturing || remaining === 0}
            className="shutter-ring"
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: remaining === 0 ? '#3A3835' : '#FFFFFF',
              border: '4px solid #141311',
              outline: '3px solid rgba(255, 255, 255, 0.75)',
              cursor: remaining === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)'
            }}
            title="Ambil Foto"
          >
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: remaining === 0 ? '#4A4845' : 'radial-gradient(circle, #FFFFFF 65%, #ECEBE6 100%)',
              border: '2px solid rgba(0, 0, 0, 0.12)'
            }} />
          </button>

          {/* Right Pillar: Lens Flip Camera (48x48px - Identical to Left Pillar!) */}
          <button
            onClick={flipCamera}
            style={{
              background: '#1A1815',
              border: '1.5px solid rgba(255, 255, 255, 0.22)',
              color: '#FFFFFF',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            title="Putar Kamera (Selfie / Belakang)"
          >
            <RotateCcw size={19} />
          </button>
        </div>

        {/* Row 3: Footnote / Film Stamp (Safe clearance above Android Navbar) */}
        <div style={{
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10.5px',
          color: '#86868B',
          opacity: 0.75,
          fontFamily: 'var(--font-mono)'
        }}>
          <span>SUDUTBINGKAI</span>
          <span>•</span>
          <span>TAMU: <strong>{guestName || 'UNDANGAN'}</strong></span>
          {tableNumber && <span>• MEJA {tableNumber}</span>}
        </div>
      </footer>

      {/* Sleek Wish Input Drawer */}
      <AnimatePresence>
        {showWishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}
            onClick={() => setShowWishModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                color: '#1D1D1F',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={16} color="#C27803" />
                  <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>Tulis Ucapan Singkat</strong>
                </div>
                <button
                  onClick={() => setShowWishModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#86868B' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '14px', lineHeight: 1.4 }}>
                Ucapan ini akan menempel manis di foto jepretan Anda berikutnya.
              </p>

              <input
                type="text"
                autoFocus
                maxLength={60}
                placeholder="Contoh: Bahagia selalu Sarah & Dimas! 🎉"
                value={currentWish}
                onChange={(e) => setCurrentWish(e.target.value)}
                className="glass-input"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                {currentWish && (
                  <button
                    onClick={() => setCurrentWish('')}
                    style={{
                      background: 'rgba(0,0,0,0.06)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#515154'
                    }}
                  >
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setShowWishModal(false)}
                  className="btn-apple-black"
                  style={{ flex: 1, padding: '12px', fontSize: '13.5px', borderRadius: '12px' }}
                >
                  Simpan Ucapan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Personal Roll Modal / Drawer with Motion Spring Animation */}
      <AnimatePresence>
        {showRollModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(16px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                background: '#FFFFFF',
                color: '#1D1D1F',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px 36px',
                maxHeight: '82vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                    ROLL FOTO SAYA ({myPhotos.length} JEPETAN)
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: '2px 0 0' }}>
                    Koleksi Momen {guestName}
                  </h3>
                </div>

                <button
                  onClick={() => setShowRollModal(false)}
                  className="glass-pill"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photos List */}
              {myPhotos.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#86868B' }}>
                  <Camera size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px', margin: 0 }}>Belum ada foto yang diambil.</p>
                  <span style={{ fontSize: '12px' }}>Arahkan kamera ke momen seru dan tekan tombol rana!</span>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: '12px',
                  overflowY: 'auto',
                  paddingBottom: '20px'
                }}>
                  {myPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        background: '#FBFBFA',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', aspectRatio: photo.aspectRatio === '1:1' ? '1/1' : photo.aspectRatio === '9:16' ? '9/16' : '3/4', background: '#000' }}>
                        <img src={photo.imageData} alt={`Jepretan #${photo.shotNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="font-mono-film" style={{ fontSize: '10px', color: '#86868B' }}>
                          #{photo.shotNumber}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {/* Point 2: Share Button */}
                          <button
                            onClick={() => handleSharePhoto(photo)}
                            title="Bagikan ke WhatsApp/IG"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#C27803',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '2px'
                            }}
                          >
                            <Share2 size={13} />
                          </button>

                          <button
                            onClick={() => downloadSinglePhoto(photo.imageData, photo.shotNumber)}
                            title="Unduh ke HP"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#1D1D1F',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '2px'
                            }}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>

                      {photo.caption && (
                        <div style={{
                          padding: '0 10px 8px 10px',
                          fontSize: '10px',
                          color: '#78350F',
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ fontSize: '10px', flexShrink: 0, fontStyle: 'normal' }}>💬</span>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            &ldquo;{photo.caption}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Bottom Actions */}
              <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowRollModal(false)}
                    className="btn-apple-black"
                    style={{ flex: 1, padding: '11px', fontSize: '13px', borderRadius: '12px' }}
                  >
                    <span>Kembali Motret ({remaining} Sisa)</span>
                  </button>

                  <Link
                    href={`/event/${eventId}`}
                    className="glass-pill"
                    style={{ padding: '11px 16px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Eye size={14} />
                    <span>Galeri Bersama</span>
                  </Link>
                </div>

                {remaining > 0 && (
                  <button
                    onClick={() => {
                      setShowRollModal(false);
                      galleryInputRef.current?.click();
                    }}
                    style={{
                      background: 'rgba(0, 0, 0, 0.03)',
                      border: '1px dashed rgba(0, 0, 0, 0.18)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#6E6E73',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={13} color="#86868B" />
                    <span>Atau unggah foto dari galeri HP ({remaining} slot tersisa)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quota Exhausted Overlay with Point 6: Voice Note Closing Message */}
      {remaining === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11, 10, 9, 0.94)',
          zIndex: 85,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          textAlign: 'center',
          overflowY: 'auto'
        }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(194, 120, 3, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', marginBottom: '14px' }}>
            <Film size={26} />
          </div>

          <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', marginBottom: '6px' }}>
            ROLL KAMERA SELESAI
          </span>

          <h2 className="font-display-serif" style={{ fontSize: '24px', color: '#FFFFFF', marginBottom: '8px' }}>
            Terima Kasih, {guestName}!
          </h2>

          <p style={{ color: '#A1A1A6', fontSize: '13px', maxWidth: '320px', lineHeight: 1.5, marginBottom: '20px' }}>
            Anda telah menghabiskan seluruh jepretan ({maxShots} foto). Semua foto telah aman tersimpan di roll pernikahan {event?.coupleOrHost || 'pengantin'}.
          </p>

          {/* Point 6: Voice Note Penutup for Host */}
          {event?.allowVoiceNote !== false && !hasSentVoice && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              padding: '18px 20px',
              maxWidth: '320px',
              width: '100%',
              marginBottom: '20px'
            }}>
              <span className="font-mono-film" style={{ color: '#D97706', fontSize: '10.5px', display: 'block', marginBottom: '4px' }}>
                PESAN PENUTUP SPESIAL
              </span>
              <strong style={{ fontSize: '13px', color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                Tinggalkan Ucapan Suara untuk Pengantin
              </strong>

              {!audioBlob ? (
                <div>
                  <button
                    onClick={isRecording ? stopRecordingVoice : startRecordingVoice}
                    style={{
                      background: isRecording ? '#E11D48' : '#C27803',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '10px 20px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px'
                    }}
                  >
                    {isRecording ? <Square size={14} /> : <Mic size={14} />}
                    <span>{isRecording ? `Merekam (${recordDuration}s / 15s) - Stop` : 'Tekan & Rekam Ucapan (15s)'}</span>
                  </button>
                  {isRecording && (
                    <span style={{ fontSize: '11px', color: '#F87171', display: 'block', marginTop: '6px', animation: 'pulse 1s infinite' }}>
                      ● Sedang merekam suara Anda...
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#4ADE80' }}>✓ Rekaman suara siap dikirim ({recordDuration}s)</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={submitVoiceNote}
                      disabled={isUploadingAudio}
                      style={{
                        background: '#C27803',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isUploadingAudio ? 'Mengirim...' : 'Kirim Pesan Suara'}
                    </button>
                    <button
                      onClick={() => setAudioBlob(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Ulangi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {hasSentVoice && (
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E', borderRadius: '14px', padding: '10px 16px', maxWidth: '320px', width: '100%', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: '#86EFAC' }}>✓ Pesan suara Anda telah berhasil disimpan untuk pengantin!</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={() => setShowRollModal(true)}
              className="btn-apple-black"
              style={{ background: '#FFFFFF', color: '#1D1D1F', padding: '12px', fontSize: '13.5px', borderRadius: '12px' }}
            >
              <span>Buka Roll Foto Saya ({myPhotos.length})</span>
            </button>

            <Link
              href={`/event/${eventId}`}
              className="glass-pill"
              style={{ padding: '12px', fontSize: '13.5px', textDecoration: 'none', color: '#FFFFFF', textAlign: 'center' }}
            >
              <span>Buka Galeri Bersama</span>
            </Link>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );

  // If user hasn't entered their name yet (Point 7: Simple Name Check-in)
  const checkInScreen = (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px calc(28px + env(safe-area-inset-bottom, 0px))',
      background: 'linear-gradient(180deg, #FBFBFA 0%, #F4F4F1 100%)',
      color: '#1D1D1F',
      position: 'relative'
    }}>
      {/* Background Ambient Radial Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(194, 120, 3, 0.08) 0%, rgba(251, 251, 250, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="glass-card" style={{
        maxWidth: '380px',
        width: '100%',
        padding: '32px 22px 28px',
        borderRadius: '28px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 20px 48px -12px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)'
      }}>
        <img 
          src="/sudut-bingkai-logo.png" 
          alt="Sudut Bingkai" 
          style={{ height: '32px', width: 'auto', objectFit: 'contain', margin: '0 auto 16px', display: 'block' }} 
        />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(194, 120, 3, 0.08)',
          border: '1px solid rgba(194, 120, 3, 0.22)',
          padding: '4px 14px',
          borderRadius: '999px',
          marginBottom: '14px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C27803' }} />
          <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 600 }}>
            {event?.coupleOrHost || 'Pernikahan Spesial'}
          </span>
        </div>

        <h1 className="font-display-serif" style={{ fontSize: '26px', lineHeight: 1.2, marginBottom: '10px', color: '#1D1D1F' }}>
          Kamera Tamu <em>Digital</em>
        </h1>

        <p style={{ color: '#515154', fontSize: '13px', lineHeight: 1.6, marginBottom: '22px' }}>
          Jepret momen seru dan hangat di meja Anda. Foto langsung tersimpan ke album {event?.coupleOrHost || 'pengantin'} tanpa unduh aplikasi.
        </p>

        <form onSubmit={handleNameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
              Nama Anda *
            </label>
            <input
              type="text"
              required
              maxLength={24}
              placeholder="Contoh: Sarah & Budi"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '16px',
                minHeight: '48px'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-apple-black"
            style={{ width: '100%', padding: '14px', borderRadius: '14px', marginTop: '4px', minHeight: '48px', fontSize: '15px' }}
          >
            <span>Buka Rana Kamera</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#6E6E73', fontSize: '11.5px' }}>
          <Check size={14} color="#C27803" />
          <span>Tersedia <strong>{maxShots} jepretan</strong> analog {presetInfo.name}</span>
        </div>
      </div>
    </div>
  );

  if (loadingEvent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0A09', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#C27803', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '13px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>MEMPERSIAPKAN ROLL KAMERA...</p>
        </div>
      </div>
    );
  }

  if (eventNotFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFBFA', color: '#1D1D1F', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '40px 28px', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Film size={26} />
          </div>
          <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
            KODE ACARA TIDAK VALID
          </span>
          <h1 className="font-display-serif" style={{ fontSize: '26px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>
            Acara Tidak Ditemukan
          </h1>
          <p style={{ color: '#6E6E73', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '24px' }}>
            Tautan barcode kamera acara ini tidak ditemukan atau belum didaftarkan oleh penyelenggara.
          </p>
          <Link href="/" className="btn-apple-black" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', textDecoration: 'none', borderRadius: '12px', fontSize: '13.5px' }}>
            <span>Kembali ke Beranda</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  // DESKTOP STUDIO VIEW (Apple Luminous Light Glass Studio)
  if (isDesktop) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F4F4F1',
        color: '#1D1D1F',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Background Radial Glow */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(194, 120, 3, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Studio Top Navigation */}
        <header className="glass-nav" style={{
          position: 'relative',
          zIndex: 50,
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowLeft size={16} />
              <img 
                src="/sudut-bingkai-logo.png" 
                alt="Sudut Bingkai" 
                style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span style={{ color: 'rgba(0, 0, 0, 0.2)' }}>/</span>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '10.5px' }}>
              STUDIO KAMERA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href={`/event/${eventId}`} className="btn-apple-black" style={{ fontSize: '13px', padding: '8px 18px', textDecoration: 'none' }}>
              <Eye size={14} />
              <span>Buka Galeri Acara</span>
            </Link>
          </div>
        </header>

        {/* Studio Body: Side-by-Side Smartphone Chassis + Info */}
        <main style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          gap: '64px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Left Column: Smartphone Frame */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="phone-mockup">
              <div className="phone-island" />
              <div style={{ flex: 1, position: 'relative' }}>
                {hasEnteredName ? cameraViewfinder : checkInScreen}
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Event Context & Mobile QR Code */}
          <div>
            <div className="glass-pill" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              marginBottom: '20px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C27803' }} />
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                PERNIKAHAN & ACARA
              </span>
            </div>

            <h1 className="font-display-serif" style={{ fontSize: '46px', lineHeight: 1.1, marginBottom: '16px', color: '#1D1D1F' }}>
              {event?.title || 'Pernikahan Dimas & Sarah'}
            </h1>

            <p style={{ fontSize: '16px', color: '#515154', lineHeight: 1.7, marginBottom: '32px', maxWidth: '540px' }}>
              Anda sedang membuka kamera tamu melalui browser desktop. Anda dapat langsung menggunakan kamera analog pada layar di samping, atau memindai QR code di bawah dengan smartphone Anda untuk memotret langsung di genggaman tangan.
            </p>

            {/* QR Scan Card */}
            <div className="glass-card" style={{
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              maxWidth: '520px',
              marginBottom: '32px'
            }}>
              {qrDataUrl && (
                <div style={{
                  padding: '8px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  flexShrink: 0
                }}>
                  <img src={qrDataUrl} alt="Scan QR" style={{ width: '110px', height: '110px', display: 'block' }} />
                </div>
              )}
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', color: '#1D1D1F' }}>
                  Pindai dengan Smartphone
                </h2>
                <p style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5, marginBottom: '12px' }}>
                  Arahkan kamera ponsel Anda ke QR ini untuk membuka kamera tamu secara instan tanpa unduh aplikasi.
                </p>
                <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                  PRESET: {presetInfo.name} • {maxShots} FOTO/TAMU
                </span>
              </div>
            </div>

            {/* Event Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '520px' }}>
              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>
                  FILTER
                </span>
                <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{presetInfo.name}</strong>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>
                  BINGKAI
                </span>
                <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{activeFrameTemplate.name}</strong>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
                <span className="font-mono-film" style={{ color: '#86868B', display: 'block', marginBottom: '4px' }}>
                  BATAS FOTO
                </span>
                <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{maxShots} / Tamu</strong>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // MOBILE FULLSCREEN VIEW (100dvh edge to edge)
  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      minHeight: '100vh',
      overflow: 'hidden',
      background: hasEnteredName ? '#0B0A09' : '#FFFFFF'
    }}>
      {hasEnteredName ? cameraViewfinder : checkInScreen}
    </div>
  );
}
