'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Zap, ZapOff, RotateCcw, ArrowLeft, ArrowRight, Camera, QrCode as QrIcon, 
  Check, Eye, Download, X, Heart, MessageSquare, CheckCircle2, Film,
  Share2, Layers, Mic, MicOff, Play, Square, WifiOff,
  Image as ImageIcon, AlertTriangle, Upload, Trash2
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { EventData, FilmPresetId, PACKAGE_TIERS, EventPackageTier } from '@/lib/types';
import { FILM_PRESETS, applyAnalogFilterToCanvas, applyPhotoEnhancement } from '@/lib/filters';
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
import ConfirmModal from '@/components/ConfirmModal';
import VideoWishRecorder from '@/components/VideoWishRecorder';

interface GuestPhoto {
  id: string;
  shotNumber: number;
  imageData: string;
  timestamp: string;
  caption?: string;
  aspectRatio?: '1:1' | '3:4' | '9:16';
  frameId?: FrameId;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 320 : direction < 0 ? -320 : 0,
    opacity: 0,
    scale: 0.92,
    rotate: direction > 0 ? 3.5 : direction < 0 ? -3.5 : 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      x: { type: 'spring' as const, stiffness: 320, damping: 30 },
      opacity: { duration: 0.2 },
      scale: { type: 'spring' as const, stiffness: 320, damping: 30 },
      rotate: { type: 'spring' as const, stiffness: 320, damping: 30 }
    }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 320 : -320,
    opacity: 0,
    scale: 0.92,
    rotate: direction < 0 ? 3.5 : -3.5,
    transition: {
      x: { type: 'spring' as const, stiffness: 320, damping: 30 },
      opacity: { duration: 0.2 }
    }
  })
};

function getOrCreateGuestSession(canonicalId: string, urlId: string): string {
  if (typeof window === 'undefined') return 'sess_' + Date.now();
  const primaryKey = `sb_guest_session_${canonicalId}`;
  const secondaryKey = `sb_guest_session_${urlId}`;
  let sId = localStorage.getItem(primaryKey) || localStorage.getItem(secondaryKey);
  if (!sId) {
    sId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
  try {
    localStorage.setItem(primaryKey, sId);
    if (secondaryKey !== primaryKey) {
      localStorage.setItem(secondaryKey, sId);
    }
  } catch {}
  return sId;
}

export default function GuestCameraPage() {
  const params = useParams();
  const eventId = params.id as string;
  const isDemo = eventId === 'demo' || eventId === 'simulation' || eventId === 'test';

  const [event, setEvent] = useState<EventData | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Custom Glass Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Lanjutkan',
    variant: 'primary',
    onConfirm: () => {}
  });
  
  // Point 3: Flash modes: 'screen' (white screen strobe) | 'torch' (LED back hardware light) | 'off'
  const [flashMode, setFlashMode] = useState<'screen' | 'torch' | 'off'>('off');
  
  // Point 8: Multi-Aspect Ratio: '3:4' | '1:1' | '9:16'
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '9:16'>('3:4');

  // Point 1: Frame toggle (guest can choose framed vs raw)
  const [useFrame, setUseFrame] = useState(true);

  // Analog Film Preset Selection (defaults to event preset, switchable if host allows)
  const [selectedPreset, setSelectedPreset] = useState<FilmPresetId>('portra');

  // Point 5: Offline queue status
  const [offlineCount, setOfflineCount] = useState(0);

  const [shotCount, setShotCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const c = localStorage.getItem(`sb_shot_count_${eventId}`);
      return c ? parseInt(c, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [maxShots, setMaxShots] = useState<number>(() => {
    if (typeof window === 'undefined') return 20;
    try {
      const m = localStorage.getItem(`sb_max_shots_${eventId}`);
      return m ? parseInt(m, 10) || 20 : 20;
    } catch {
      return 20;
    }
  });
  const remaining = Math.max(0, maxShots - shotCount);
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
  const [previewPhoto, setPreviewPhoto] = useState<GuestPhoto | null>(null);
  const [previewSlideDirection, setPreviewSlideDirection] = useState<number>(0);

  const paginatePreview = (dir: number) => {
    if (myPhotos.length <= 1 || !previewPhoto) return;
    hapticLightTap();
    setPreviewSlideDirection(dir);
    const idx = myPhotos.findIndex(p => p.id === previewPhoto.id);
    const nextIdx = (idx + dir + myPhotos.length) % myPhotos.length;
    setPreviewPhoto(myPhotos[nextIdx]);
  };
  const [currentWish, setCurrentWish] = useState('');
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Point 6: Voice Note Recording States (at Quota Exhausted)
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [hasSentVoice, setHasSentVoice] = useState(false);
  const [hasSentVideoWish, setHasSentVideoWish] = useState(false);
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
    // 1. Initialize persistent session and fast local shot count recovery
    const initialSession = getOrCreateGuestSession(eventId, eventId);
    setGuestSessionId(initialSession);

    const cachedCount = localStorage.getItem(`sb_shot_count_${eventId}`);
    if (cachedCount) {
      const parsedCount = parseInt(cachedCount, 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        setShotCount(parsedCount);
      }
    }

    if (localStorage.getItem(`sb_has_sent_voice_${eventId}`) === 'true') {
      setHasSentVoice(true);
    }
    if (localStorage.getItem(`sb_has_sent_video_${eventId}`) === 'true') {
      setHasSentVideoWish(true);
    }

    if (isDemo) {
      setEvent({
        id: 'demo',
        title: 'Preview Kamera Tamu',
        coupleOrHost: 'Tamu Undangan',
        eventDate: new Date().toISOString(),
        preset: 'portra',
        allowedPresets: ['portra', 'funsaver', 'quicksnap', 'ektar', 'cinestill', 'ilford', 'agfa', 'trix'],
        allowGuestPresetSwitch: true,
        allowGuestFrameToggle: true,
        shotsPerGuest: 20,
        maxGuests: 1,
        revealMode: 'instant',
        frameId: 'minimal-gold',
        createdAt: new Date().toISOString()
      });
      setMaxShots(20);
      setLoadingEvent(false);
      const savedName = localStorage.getItem(`sb_guest_${eventId}`);
      if (savedName) {
        setGuestName(savedName);
        setHasEnteredName(true);
      } else {
        setGuestName('Tamu Undangan');
        setHasEnteredName(true);
      }
    } else {
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

            const canonicalId = data.event.id;
            const activeSession = getOrCreateGuestSession(canonicalId, eventId);
            setGuestSessionId(activeSession);

            if (localStorage.getItem(`sb_has_sent_voice_${canonicalId}`) === 'true') {
              setHasSentVoice(true);
            }
            if (localStorage.getItem(`sb_has_sent_video_${canonicalId}`) === 'true') {
              setHasSentVideoWish(true);
            }

            // Dual-key lookup: check canonical event.id as well
            const canonicalName = localStorage.getItem(`sb_guest_${canonicalId}`);
            if (canonicalName) {
              setGuestName(canonicalName);
              setHasEnteredName(true);
            }

            // Sync authentic shot count and photos directly from backend database
            const urlSavedName = typeof window !== 'undefined' ? (localStorage.getItem(`sb_guest_${eventId}`) || localStorage.getItem('sb_guest_session')) : null;
            const guestIdentifier = canonicalName || urlSavedName || '';
            const queryParams = new URLSearchParams({
              eventId: canonicalId,
              sessionId: activeSession
            });
            if (guestIdentifier && guestIdentifier !== 'Tamu') {
              queryParams.set('guestName', guestIdentifier);
            }

            // Verify if guest already submitted a voice note or video wish
            if (guestIdentifier && guestIdentifier !== 'Tamu' && guestIdentifier !== 'Tamu Undangan') {
              fetch(`/api/voice-notes?eventId=${canonicalId}&guestName=${encodeURIComponent(guestIdentifier)}`)
                .then(res => res.json())
                .then(vData => {
                  if (vData.success && Array.isArray(vData.voiceNotes) && vData.voiceNotes.length > 0) {
                    setHasSentVoice(true);
                    try {
                      localStorage.setItem(`sb_has_sent_voice_${canonicalId}`, 'true');
                      localStorage.setItem(`sb_has_sent_voice_${eventId}`, 'true');
                    } catch {}
                  }
                })
                .catch(() => {});

              fetch(`/api/video-wishes?eventId=${canonicalId}&guestName=${encodeURIComponent(guestIdentifier)}`)
                .then(res => res.json())
                .then(wData => {
                  const list = wData.videoWishes || wData.wishes || [];
                  if (wData.success && Array.isArray(list) && list.length > 0) {
                    setHasSentVideoWish(true);
                    try {
                      localStorage.setItem(`sb_has_sent_video_${canonicalId}`, 'true');
                      localStorage.setItem(`sb_has_sent_video_${eventId}`, 'true');
                    } catch {}
                  }
                })
                .catch(() => {});
            }

            fetch(`/api/photos?${queryParams.toString()}`)
              .then(res => res.json())
              .then(pData => {
                if (pData.success && Array.isArray(pData.photos)) {
                  const serverPhotos: GuestPhoto[] = pData.photos.map((p: any, idx: number) => ({
                    id: p.id,
                    shotNumber: p.shotNumber || (idx + 1),
                    imageData: p.imageData,
                    timestamp: new Date(p.timestamp || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    caption: p.caption || '',
                    aspectRatio: p.aspectRatio || '3:4',
                    frameId: p.frameId || 'none'
                  }));

                  const verifiedCount = serverPhotos.length;
                  if (verifiedCount > 0) {
                    setShotCount(verifiedCount);
                    setMyPhotos(serverPhotos);
                    setLastShotThumb(serverPhotos[serverPhotos.length - 1].imageData);
                    try {
                      localStorage.setItem(`sb_shot_count_${canonicalId}`, String(verifiedCount));
                      localStorage.setItem(`sb_shot_count_${eventId}`, String(verifiedCount));
                      const persistentShots = serverPhotos.slice(-50);
                      localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(persistentShots));
                      if (event?.id) localStorage.setItem(`sb_my_shots_${event.id}`, JSON.stringify(persistentShots));
                    } catch {}
                  }
                }
              })
              .catch(err => console.warn('Sync server photos error:', err));
          } else {
            setEventNotFound(true);
          }
        })
        .catch(() => setEventNotFound(true))
        .finally(() => setLoadingEvent(false));

      const savedName = localStorage.getItem(`sb_guest_${eventId}`) || localStorage.getItem('sb_guest_session');
      if (savedName) {
        setGuestName(savedName);
        setHasEnteredName(true);
      }
    }

    try {
      const savedPhotos = localStorage.getItem(`sb_my_shots_${eventId}`);
      if (savedPhotos) {
        const parsed = JSON.parse(savedPhotos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMyPhotos(parsed);
          setShotCount(prev => Math.max(prev, parsed.length));
          if (parsed.length > 0) {
            setLastShotThumb(parsed[parsed.length - 1].imageData);
          }
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

  const attachStreamToVideo = (element: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!element || !stream) return;
    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }
    element.onloadedmetadata = () => {
      element.play().catch(() => {});
    };
    element.play().catch(() => {});
  };

  const handleVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      attachStreamToVideo(el, streamRef.current);
    }
  };

  const stopCameraHardware = () => {
    if (streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        // @ts-ignore
        track?.applyConstraints?.({ advanced: [{ torch: false }] }).catch(() => {});
      } catch {}
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        videoRef.current.srcObject = null;
      } catch {}
    }
  };

  const startCamera = async () => {
    if (remaining === 0) {
      stopCameraHardware();
      return;
    }
    setCameraError(null);
    stopCameraHardware();

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (remaining === 0) {
        stream.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        return;
      }
      streamRef.current = stream;
      attachStreamToVideo(videoRef.current, stream);

      // Lock continuous autofocus and exposure for crisp focus
      try {
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        const capabilities = track.getCapabilities?.();
        const advanced: any = {};
        // @ts-ignore
        if (capabilities?.focusMode?.includes('continuous')) {
          advanced.focusMode = 'continuous';
        }
        // @ts-ignore
        if (capabilities?.exposureMode?.includes('continuous')) {
          advanced.exposureMode = 'continuous';
        }
        if (Object.keys(advanced).length > 0) {
          // @ts-ignore
          await track.applyConstraints({ advanced: [advanced] });
        }
      } catch {}
    } catch (err) {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (remaining === 0) {
          fallback.getTracks().forEach(t => {
            try { t.stop(); } catch {}
          });
          return;
        }
        streamRef.current = fallback;
        attachStreamToVideo(videoRef.current, fallback);
      } catch (fErr) {
        setCameraError('Izinkan akses kamera di browser ponsel Anda untuk memotret.');
      }
    }
  };

  useEffect(() => {
    if (hasEnteredName && remaining > 0) {
      startCamera();
    } else {
      stopCameraHardware();
    }
    return () => {
      stopCameraHardware();
    };
  }, [hasEnteredName, facingMode, remaining]);

  // iOS Safari / Mobile Background Sleep Recovery: Auto-resume camera stream if user locks phone or switches apps
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && hasEnteredName && remaining > 0) {
        const track = streamRef.current?.getVideoTracks()[0];
        const isTrackDead = !track || track.readyState === 'ended' || track.muted;
        const isVideoPaused = videoRef.current ? (videoRef.current.paused || videoRef.current.ended) : true;
        if (isTrackDead || isVideoPaused) {
          startCamera();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [hasEnteredName, remaining, facingMode]);

  // Hardware Torch Control (Physical LED Flashlight on Back Camera)
  const setHardwareTorch = async (enabled: boolean): Promise<boolean> => {
    if (!streamRef.current || facingMode !== 'environment') return false;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return false;
      // @ts-ignore
      const capabilities = track.getCapabilities?.();
      // @ts-ignore
      if (capabilities?.torch) {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: enabled }] });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Hardware torch error:', err);
      return false;
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    const clean = guestName.trim();
    localStorage.setItem(`sb_guest_${eventId}`, clean);
    if (event?.id) {
      localStorage.setItem(`sb_guest_${event.id}`, clean);
    }
    localStorage.setItem('sb_guest_session', clean);
    setHasEnteredName(true);

    const targetEventId = event?.id || eventId;
    if (clean && clean !== 'Tamu' && clean !== 'Tamu Undangan') {
      fetch(`/api/voice-notes?eventId=${targetEventId}&guestName=${encodeURIComponent(clean)}`)
        .then(res => res.json())
        .then(vData => {
          if (vData.success && Array.isArray(vData.voiceNotes) && vData.voiceNotes.length > 0) {
            setHasSentVoice(true);
            try {
              localStorage.setItem(`sb_has_sent_voice_${targetEventId}`, 'true');
              localStorage.setItem(`sb_has_sent_voice_${eventId}`, 'true');
            } catch {}
          }
        })
        .catch(() => {});

      fetch(`/api/video-wishes?eventId=${targetEventId}&guestName=${encodeURIComponent(clean)}`)
        .then(res => res.json())
        .then(wData => {
          const list = wData.videoWishes || wData.wishes || [];
          if (wData.success && Array.isArray(list) && list.length > 0) {
            setHasSentVideoWish(true);
            try {
              localStorage.setItem(`sb_has_sent_video_${targetEventId}`, 'true');
              localStorage.setItem(`sb_has_sent_video_${eventId}`, 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    toast.success(`Selamat datang, ${clean}! Kamera siap digunakan.`);
  };

  const flipCamera = async () => {
    hapticToggle();
    if (flashMode === 'torch') {
      await setHardwareTorch(false);
      setFlashMode('screen');
      toast.info('Kamera depan: dialihkan ke Flash Layar');
    }
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Point 8: Cycle Aspect Ratios
  const cycleAspectRatio = () => {
    hapticDialClick();
    if (aspectRatio === '3:4') setAspectRatio('1:1');
    else if (aspectRatio === '1:1') setAspectRatio('9:16');
    else setAspectRatio('3:4');
  };

  // Point 3: Cycle Flash Modes (Hardware Torch LED -> Screen Flash -> Off)
  const cycleFlashMode = async () => {
    hapticDoubleTick();
    if (flashMode === 'off') {
      // 1. Try Hardware Torch LED on Back Camera first
      if (facingMode === 'environment') {
        const torchActive = await setHardwareTorch(true);
        if (torchActive) {
          setFlashMode('torch');
          toast.success('🔦 Senter LED Kamera Menyala');
          return;
        }
      }
      // If hardware torch is not supported (e.g. iOS Safari WebRTC or front camera)
      await setHardwareTorch(false);
      setFlashMode('screen');
      toast.info('⚡ Flash Layar Aktif (Kilat putih saat jepret)');
    } else if (flashMode === 'torch') {
      // 2. Switch from Hardware Torch to Screen Flash
      await setHardwareTorch(false);
      setFlashMode('screen');
      toast.info('⚡ Flash Layar Aktif (Kilat putih saat jepret)');
    } else {
      // 3. Turn off flash
      await setHardwareTorch(false);
      setFlashMode('off');
      toast.info('Flash Dimatikan');
    }
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
    // Deliver pristine studio resolution: 1440x1920 (QHD) for 3:4, 1440x1440 for 1:1, 1080x1920 for 9:16
    const targetAspect = aspectRatio === '1:1' ? 1 : aspectRatio === '9:16' ? 9 / 16 : 3 / 4;
    const baseWidth = aspectRatio === '9:16' ? 1080 : 1440;
    canvas.width = baseWidth;
    canvas.height = Math.round(baseWidth / targetAspect);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Enforce highest quality image smoothing algorithms
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const isVideo = source instanceof HTMLVideoElement;
      const sW = isVideo ? source.videoWidth || 1280 : source.naturalWidth || 1280;
      const sH = isVideo ? source.videoHeight || 960 : source.naturalHeight || 960;
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

      // Photographic DSP Enhancement Engine: Unsharp Masking + Contrast S-Curve
      // Sharpens edge micro-detail (eyes, smiles, clothing, jewelry) & eliminates foggy webcam look
      applyPhotoEnhancement(ctx, canvas.width, canvas.height, 0.24);

      // 1. Apply analog color emulations
      const currentPreset = selectedPreset || event?.preset || 'portra';
      const activeFrameId = (useFrame && event?.frameId) ? event.frameId : 'none';
      // Only show glowing date stamp when frame is none or retro-90s, to prevent ugly overlap over gold wedding plaques!
      const shouldShowDateStamp = activeFrameId === 'none' || activeFrameId === 'retro-90s';
      applyAnalogFilterToCanvas(canvas, ctx, currentPreset, shouldShowDateStamp);

      // 2. Apply decorative event frame if enabled
      if (activeFrameId !== 'none') {
        await applyFrameToCanvas(canvas, ctx, {
          frameId: activeFrameId,
          coupleOrTitle: event?.coupleOrHost || 'Pernikahan Spesial',
          eventDate: event?.eventDate,
          tagline: event?.frameText,
          customFrameUrl: event?.customFrameUrl
        });
      }

      // Optimized Studio High-Res output (0.85 quality): 50% lighter payload, zero perceptible loss, prevents ballroom timeout
      const highResDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const newShotNum = shotCount + 1;
      setShotCount(newShotNum);
      if (newShotNum >= maxShots) {
        stopCameraHardware();
      }

      // Lightweight persistence that NEVER overflows 5MB quota (isolated per event)
      const canonicalId = event?.id || eventId;
      try {
        localStorage.setItem(`sb_shot_count_${canonicalId}`, String(newShotNum));
        localStorage.setItem(`sb_shot_count_${eventId}`, String(newShotNum));
      } catch {}

      // Create a sharp, balanced storage version (720px width, 0.80 quality, ~45KB)
      // This guarantees safe localStorage persistence across page reloads without running out of quota!
      const storageCanvas = document.createElement('canvas');
      const storageWidth = aspectRatio === '9:16' ? 540 : 720;
      storageCanvas.width = storageWidth;
      storageCanvas.height = Math.round(storageWidth / targetAspect);
      const sCtx = storageCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        sCtx.drawImage(canvas, 0, 0, storageCanvas.width, storageCanvas.height);
      }
      const storageBase64 = storageCanvas.toDataURL('image/jpeg', 0.80);
      setLastShotThumb(storageBase64);

      // Save photo locally to guest personal roll with the FULL high-res image
      const newGuestPhoto: GuestPhoto = {
        id: 'shot-' + Date.now(),
        shotNumber: newShotNum,
        imageData: highResDataUrl, // <--- FULL HIGH RESOLUTION (QHD) FOR LIGHTBOX & DOWNLOAD!
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        caption: currentWish.trim(),
        aspectRatio,
        frameId: activeFrameId
      };

      const updatedShots = [...myPhotos, newGuestPhoto];
      setMyPhotos(updatedShots);

      // Store sharp storageBase64 in localStorage so reloads don't blow up 5MB quota
      try {
        const persistentShots = updatedShots.slice(-50).map(p => ({
          ...p,
          imageData: p.id === newGuestPhoto.id ? storageBase64 : (p.imageData && p.imageData.length < 150000 ? p.imageData : storageBase64)
        }));
        localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(persistentShots));
        if (event?.id) localStorage.setItem(`sb_my_shots_${event.id}`, JSON.stringify(persistentShots));
      } catch (err) {
        console.warn('LocalStorage quota limit reached, saving in memory:', err);
      }

      // Trigger polaroid pop feedback
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);

      // Point 5: Send high-res photo to server or store in offline queue if offline
      const displayName = guestName;
      const currentSession = guestSessionId || getOrCreateGuestSession(canonicalId, eventId);

      if (isDemo) {
        // PURE LOCAL SIMULATION DEMO!
        // DO NOT hit server / database!
        // Stored only locally in guest phone memory (localStorage).
        toast.success(`Bidikan #${newShotNum} berhasil tersimpan di rol kamera!`);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addPhotoToOfflineQueue({
          id: newGuestPhoto.id,
          eventId: canonicalId,
          sessionId: currentSession,
          guestName: displayName,
          shotNumber: newShotNum,
          imageData: highResDataUrl,
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
            eventId: canonicalId,
            sessionId: currentSession,
            guestName: displayName,
            shotNumber: newShotNum,
            imageData: highResDataUrl,
            caption: currentWish.trim(),
            aspectRatio,
            frameId: activeFrameId
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.photo) {
            const confirmedUrl = data.photo.imageData || highResDataUrl;
            const confirmedId = data.photo.id || newGuestPhoto.id;
            setMyPhotos(prev => prev.map(p => p.id === newGuestPhoto.id ? { ...p, id: confirmedId, imageData: confirmedUrl } : p));
            // Update local storage representation
            try {
              const currentLocal = JSON.parse(localStorage.getItem(`sb_my_shots_${eventId}`) || '[]');
              const updatedLocal = currentLocal.map((p: any) => p.id === newGuestPhoto.id ? { ...p, id: confirmedId, imageData: storageBase64 } : p);
              localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(updatedLocal));
              if (event?.id) localStorage.setItem(`sb_my_shots_${event.id}`, JSON.stringify(updatedLocal));
            } catch {}
          } else if (!data.success && data.error) {
            toast.error(data.error);
            // Revert state so UI doesn't falsely indicate photo was kept when server denied it
            setShotCount(prev => Math.max(0, prev - 1));
            setMyPhotos(prev => {
              const reverted = prev.filter(p => p.id !== newGuestPhoto.id);
              if (reverted.length > 0) {
                setLastShotThumb(reverted[reverted.length - 1].imageData);
              } else {
                setLastShotThumb(null);
              }
              try {
                localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(reverted));
                if (event?.id) localStorage.setItem(`sb_my_shots_${event.id}`, JSON.stringify(reverted));
                localStorage.setItem(`sb_shot_count_${eventId}`, String(reverted.length));
                if (event?.id) localStorage.setItem(`sb_shot_count_${canonicalId}`, String(reverted.length));
              } catch {}
              return reverted;
            });
          }
        })
        .catch(async () => {
          // Network dropped during upload, queue it safely in IndexedDB
          await addPhotoToOfflineQueue({
            id: newGuestPhoto.id,
            eventId: canonicalId,
            sessionId: currentSession,
            guestName: displayName,
            shotNumber: newShotNum,
            imageData: highResDataUrl,
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

  const handleDeletePhoto = (photoId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus dari Rol Film?',
      description: 'Foto ini akan dihapus dari rol kamera Anda dan kuota jepretan Anda akan dikembalikan.',
      confirmText: 'Hapus Foto',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const updated = myPhotos.filter(p => p.id !== photoId);
        setMyPhotos(updated);
        setShotCount(updated.length);
        if (updated.length > 0) {
          setLastShotThumb(updated[updated.length - 1].imageData);
        } else {
          setLastShotThumb(null);
        }
        const canonicalId = event?.id || eventId;
        try {
          localStorage.setItem(`sb_shot_count_${canonicalId}`, String(updated.length));
          localStorage.setItem(`sb_shot_count_${eventId}`, String(updated.length));
          localStorage.setItem(`sb_my_shots_${eventId}`, JSON.stringify(updated.slice(-50)));
          if (event?.id) localStorage.setItem(`sb_my_shots_${event.id}`, JSON.stringify(updated.slice(-50)));
        } catch (e) {
          console.error(e);
        }
        if (!isDemo && photoId) {
          fetch(`/api/photos?id=${photoId}`, { method: 'DELETE' }).catch(err => console.warn('Delete server photo err:', err));
        }
        setPreviewPhoto(null);
        toast.success('Foto berhasil dihapus dari Rol Film Anda.');
      }
    });
  };

  const takePhoto = async () => {
    if (isCapturing || !videoRef.current || shotCount >= maxShots) return;

    // Point 3: Flash handling (Hardware Torch or Screen Flash Strobe)
    if (flashMode === 'screen') {
      setFlashTrigger(true);
      setTimeout(() => setFlashTrigger(false), 250);
    } else if (flashMode === 'torch') {
      if (facingMode === 'environment') {
        await setHardwareTorch(true);
      } else {
        setFlashTrigger(true);
        setTimeout(() => setFlashTrigger(false), 250);
      }
    }

    // Hardware ImageCapture Still API:
    // Bypasses WebRTC compressed preview stream to command the smartphone sensor
    // to capture a genuine full-megapixel still photo with hardware ISP auto-focus!
    if (typeof window !== 'undefined' && 'ImageCapture' in window && streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        // @ts-ignore
        const imageCapture = new window.ImageCapture(track);
        let photoSettings: any = {};
        try {
          // Request maximum hardware sensor resolution (e.g. 12MP/48MP)
          // @ts-ignore
          const capabilities = await imageCapture.getPhotoCapabilities?.();
          if (capabilities) {
            if (capabilities.imageWidth?.max) {
              photoSettings.imageWidth = capabilities.imageWidth.max;
            }
            if (capabilities.imageHeight?.max) {
              photoSettings.imageHeight = capabilities.imageHeight.max;
            }
          }
        } catch {}

        const photoBlob = await imageCapture.takePhoto(photoSettings);
        const img = new Image();
        const objectUrl = URL.createObjectURL(photoBlob);
        img.onload = async () => {
          await processAndUploadImage(img, facingMode === 'user');
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
        return;
      } catch (e) {
        console.warn('Hardware ImageCapture fallback to video canvas:', e);
      }
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

  const downloadSinglePhoto = async (imageUrl: string, shotNum: number) => {
    const toastId = toast.loading('Mengunduh foto...');
    try {
      let blob: Blob | null = null;
      if (imageUrl.startsWith('data:image')) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        try {
          const res = await fetch(imageUrl, { mode: 'cors' });
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Direct fetch failed, falling back to canvas:', e);
        }
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
                } else {
                  resolve(null);
                }
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = imageUrl;
          });
        }
      }

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `SudutBingkai_${event?.title || 'Acara'}_Jepretan${shotNum}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        toast.dismiss(toastId);
        toast.success(`Jepretan #${shotNum} berhasil diunduh ke galeri!`);
        return;
      }

      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `SudutBingkai_${event?.title || 'Acara'}_Jepretan${shotNum}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.dismiss(toastId);
      toast.success(`Jepretan #${shotNum} terbuka!`);
    } catch (err) {
      console.error('Download error:', err);
      toast.dismiss(toastId);
      toast.error('Gagal mengunduh foto');
    }
  };

  // Native Web Share API with Real Image File
  const handleSharePhoto = async (photo: GuestPhoto) => {
    const toastId = toast.loading('Menyiapkan foto...');
    try {
      let blob: Blob | null = null;
      if (photo.imageData.startsWith('data:image')) {
        const res = await fetch(photo.imageData);
        blob = await res.blob();
      } else {
        try {
          const res = await fetch(photo.imageData, { mode: 'cors' });
          if (res.ok) blob = await res.blob();
        } catch (e) {
          console.warn('Direct fetch failed for share, trying canvas:', e);
        }
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
                } else {
                  resolve(null);
                }
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = photo.imageData;
          });
        }
      }

      if (!blob) {
        throw new Error('Gagal menyiapkan file foto');
      }

      const file = new File([blob], `SudutBingkai_Jepretan${photo.shotNumber}.jpg`, { type: 'image/jpeg' });
      toast.dismiss(toastId);

      // Trigger Native OS Share Sheet with the real image file
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Foto Jepretan #${photo.shotNumber} - ${event?.title || 'Sudut Bingkai'}`
        });
        return;
      }

      // If file sharing is not supported by browser (e.g. desktop), auto-download and guide user
      await downloadSinglePhoto(photo.imageData, photo.shotNumber);
      toast.success('Foto tersimpan di galeri HP! Siap dibagikan ke WhatsApp atau Instagram Story.');
    } catch (err: any) {
      toast.dismiss(toastId);
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
        await downloadSinglePhoto(photo.imageData, photo.shotNumber);
        toast.info('Foto diunduh ke galeri HP untuk dibagikan.');
      }
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
    const canonicalId = event?.id || eventId;
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('eventId', canonicalId);
      formData.append('guestName', guestName || 'Tamu');
      formData.append('duration', String(recordDuration));

      const res = await fetch('/api/voice-notes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setHasSentVoice(true);
        try {
          localStorage.setItem(`sb_has_sent_voice_${canonicalId}`, 'true');
          localStorage.setItem(`sb_has_sent_voice_${eventId}`, 'true');
        } catch {}
        toast.success(`Pesan suara dan doa Anda telah tersimpan untuk ${event?.coupleOrHost || 'tuan rumah'}!`);
      } else if (data.alreadySent) {
        setHasSentVoice(true);
        try {
          localStorage.setItem(`sb_has_sent_voice_${canonicalId}`, 'true');
          localStorage.setItem(`sb_has_sent_voice_${eventId}`, 'true');
        } catch {}
        toast.info(data.error);
      } else {
        toast.error('Gagal mengirim pesan: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const maxTierPresets = (event?.packageTier && PACKAGE_TIERS[event.packageTier as EventPackageTier])
    ? (PACKAGE_TIERS[event.packageTier as EventPackageTier]?.maxPresets || 1)
    : (isDemo ? 8 : 1);

  const canSwitchPresets = Boolean(event?.allowGuestPresetSwitch && maxTierPresets > 1);

  const availablePresets: FilmPresetId[] = canSwitchPresets
    ? (event?.allowedPresets && event.allowedPresets.length > 0
        ? event.allowedPresets.slice(0, maxTierPresets)
        : [event?.preset || 'portra'])
    : [event?.preset || 'portra'];
  const presetInfo = FILM_PRESETS[selectedPreset] || (event ? FILM_PRESETS[event.preset] : FILM_PRESETS.portra) || FILM_PRESETS.portra;
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
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        position: 'relative'
      }}>
        {isDemo && (
          <div style={{
            position: 'absolute',
            bottom: '-9px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#F59E0B',
            color: '#000000',
            fontWeight: 800,
            fontSize: '9px',
            padding: '1px 8px',
            borderRadius: '999px',
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
            zIndex: 40,
            pointerEvents: 'none'
          }}>
            SIMULASI DEMO • LOKAL
          </div>
        )}
        {/* Flash Mode Minimal Button */}
        <button
          onClick={cycleFlashMode}
          style={{
            background: flashMode === 'torch'
              ? '#F59E0B'
              : flashMode === 'screen'
                ? 'rgba(245, 158, 11, 0.25)'
                : 'rgba(255, 255, 255, 0.08)',
            border: flashMode !== 'off'
              ? '1.5px solid #F59E0B'
              : '1px solid rgba(255, 255, 255, 0.18)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: flashMode === 'torch'
              ? '0 0 16px rgba(245, 158, 11, 0.6)'
              : flashMode === 'screen'
                ? '0 0 10px rgba(245, 158, 11, 0.3)'
                : 'none'
          }}
          title={flashMode === 'torch' ? 'Senter LED Kamera Aktif (Menyala)' : flashMode === 'screen' ? 'Flash Layar Aktif (Kilat saat jepret)' : 'Flash Mati'}
        >
          {flashMode === 'off' ? (
            <ZapOff size={16} color="#86868B" />
          ) : flashMode === 'torch' ? (
            <Zap size={16} fill="#000000" color="#000000" />
          ) : (
            <Zap size={16} fill="#F59E0B" color="#F59E0B" />
          )}
        </button>

        {/* Center Film Canister Pill */}
        <button
          onClick={() => {
            if (canSwitchPresets && availablePresets.length > 1) {
              const currentIndex = availablePresets.indexOf(selectedPreset);
              const nextIndex = (currentIndex + 1) % availablePresets.length;
              const nextPreset = availablePresets[nextIndex];
              hapticDialClick();
              setSelectedPreset(nextPreset);
              toast.info(`Film: ${FILM_PRESETS[nextPreset]?.name || nextPreset}`);
            }
          }}
          disabled={!canSwitchPresets || availablePresets.length <= 1}
          style={{
            background: '#1D1B18',
            border: canSwitchPresets && availablePresets.length > 1 ? '1px solid rgba(194, 120, 3, 0.65)' : '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 14px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            color: '#FFFFFF',
            cursor: canSwitchPresets && availablePresets.length > 1 ? 'pointer' : 'default',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
          }}
          title={canSwitchPresets ? 'Ketuk untuk ganti film analog' : 'Emulasi film acara'}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: presetInfo.accentColor || '#C27803' }} />
          <span className="font-mono-film" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>
            {presetInfo.name.toUpperCase()}
          </span>
          {canSwitchPresets && availablePresets.length > 1 && (
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
            ref={handleVideoRef}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
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

          {/* Fullscreen Shutter Flash Strobe (illuminates user's face and scene in dark rooms) */}
          {flashTrigger && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: '#ffffff',
              zIndex: 99999,
              pointerEvents: 'none'
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
          gap: '8px',
          width: '100%',
          flexWrap: 'wrap'
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
                padding: '6px 13px',
                borderRadius: '999px',
                color: '#FFFFFF',
                fontSize: '11px',
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
              <Layers size={12} color={useFrame ? '#FFF' : '#F59E0B'} />
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
            title={`Tuliskan ucapan untuk ${event?.coupleOrHost || 'tuan rumah'}`}
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
          <span>
            TAMU:{' '}
            <button
              onClick={() => setHasEnteredName(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 2px',
                color: '#FFFFFF',
                font: 'inherit',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '2px'
              }}
              title="Klik jika ingin ganti nama tamu"
            >
              <strong>{guestName || 'UNDANGAN'}</strong> ✎
            </button>
          </span>
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
                placeholder={`Contoh: Bahagia selalu ${event?.coupleOrHost || 'kedua mempelai'}! 🎉`}
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
                  flex: 1,
                  minHeight: 0,
                  paddingBottom: '20px'
                }}>
                  {myPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setPreviewPhoto(photo)}
                      style={{
                        background: '#FBFBFA',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 'fit-content',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: photo.aspectRatio === '1:1' ? '1 / 1' : photo.aspectRatio === '9:16' ? '9 / 16' : '3 / 4',
                        flexShrink: 0,
                        background: '#141311',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={photo.imageData}
                          alt={`Jepretan #${photo.shotNumber}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '999px',
                          padding: '3px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#fff',
                          fontSize: '9.5px',
                          fontWeight: 600
                        }}>
                          <Eye size={10} />
                          <span>Lihat</span>
                        </div>
                      </div>

                      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#86868B', fontWeight: 600 }}>
                          #{photo.shotNumber}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSharePhoto(photo);
                            }}
                            title="Bagikan ke WhatsApp/IG"
                            style={{
                              background: 'rgba(194, 120, 3, 0.1)',
                              border: 'none',
                              color: '#C27803',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                          >
                            <Share2 size={13} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSinglePhoto(photo.imageData, photo.shotNumber);
                            }}
                            title="Unduh ke HP"
                            style={{
                              background: 'rgba(0, 0, 0, 0.05)',
                              border: 'none',
                              color: '#1D1D1F',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                          >
                            <Download size={13} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(photo.id);
                            }}
                            title="Hapus foto dari Rol"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#EF4444',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                          >
                            <Trash2 size={13} />
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
                    <span>{remaining > 0 ? `Lanjut Motret (${remaining} Sisa)` : 'Tutup Rol'}</span>
                  </button>

                  <Link
                    href={`/event/${eventId}`}
                    className="glass-pill"
                    style={{ padding: '11px 16px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Eye size={14} />
                    <span>Jelajahi Galeri</span>
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

      {/* Point 1 & 2: Fullscreen Lightbox Preview Modal for My Roll */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(11, 10, 9, 0.96)',
              backdropFilter: 'blur(20px)',
              zIndex: 120,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 'calc(max(14px, env(safe-area-inset-top, 0px))) 16px calc(max(18px, env(safe-area-inset-bottom, 0px))) 16px'
            }}
          >
            {/* Lightbox Top Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FFFFFF',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'rgba(194, 120, 3, 0.25)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#FBBF24',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700
                }}>
                  JEPRETAN #{previewPhoto.shotNumber}
                </span>
                {isDemo && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#A1A1A6',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontSize: '10px'
                  }}>
                    Simulasi Lokal
                  </span>
                )}
              </div>

              <button
                onClick={() => setPreviewPhoto(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Lightbox Center Image Viewport */}
            <div style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '12px 0'
            }}>
              {/* Navigation Prev */}
              {myPhotos.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    paginatePreview(-1);
                  }}
                  style={{
                    position: 'absolute',
                    left: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 25,
                    background: 'rgba(20, 18, 16, 0.65)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                  }}
                  title="Foto Sebelumnya (Geser Kanan)"
                >
                  <ArrowLeft size={20} />
                </button>
              )}

              <AnimatePresence initial={false} custom={previewSlideDirection} mode="popLayout">
                <motion.div
                  key={previewPhoto.id}
                  custom={previewSlideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipeThreshold = 45;
                    const velocityThreshold = 400;
                    if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                      paginatePreview(1);
                    } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                      paginatePreview(-1);
                    }
                  }}
                  style={{
                    width: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    touchAction: 'none'
                  }}
                  whileTap={{ cursor: 'grabbing' }}
                >
                  <img
                    src={previewPhoto.imageData}
                    alt={`Jepretan #${previewPhoto.shotNumber}`}
                    draggable={false}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '62vh',
                      objectFit: 'contain',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                      pointerEvents: 'none'
                    }}
                  />
                  {myPhotos.length > 1 && (
                    <span style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.04em' }}>
                      ← Geser kiri/kanan untuk foto lain →
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Next */}
              {myPhotos.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    paginatePreview(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 25,
                    background: 'rgba(20, 18, 16, 0.65)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                  }}
                  title="Foto Selanjutnya (Geser Kiri)"
                >
                  <ArrowRight size={20} />
                </button>
              )}
            </div>

            {/* Lightbox Footer: Caption & Action Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
              {previewPhoto.caption ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MessageSquare size={14} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span>&ldquo;{previewPhoto.caption}&rdquo;</span>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                <button
                  onClick={() => downloadSinglePhoto(previewPhoto.imageData, previewPhoto.shotNumber)}
                  className="btn-apple-black"
                  style={{
                    background: '#C27803',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={16} />
                  <span>Simpan ke HP</span>
                </button>

                <button
                  onClick={() => handleSharePhoto(previewPhoto)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.14)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={16} />
                  <span>Bagikan</span>
                </button>

                <button
                  onClick={() => handleDeletePhoto(previewPhoto.id)}
                  title="Hapus foto dari Rol"
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Brand Celebration Outro (Clean, Elegant, Non-cluttered) */}
      {remaining === 0 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#0B0A09',
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(194, 120, 3, 0.12), transparent)',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'calc(max(20px, env(safe-area-inset-top, 0px)) + 12px) 20px calc(max(20px, env(safe-area-inset-bottom, 0px)) + 16px)',
          textAlign: 'center',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          color: '#FFFFFF'
        }}>
          <div style={{ width: '100%', maxWidth: '360px', margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Top Brand & Quota Badge (Clean unified pill, clearly visible) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              padding: '5px 14px 5px 10px',
              borderRadius: '999px',
              marginBottom: '16px'
            }}>
              <img 
                src="/corner-icon.png" 
                alt="Sudut Bingkai" 
                style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain' }} 
              />
              <span style={{ 
                fontFamily: 'var(--font-serif)', 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#FFFFFF', 
                letterSpacing: '0.03em' 
              }}>
                Sudut Bingkai
              </span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.3)' }} />
              <span className="font-mono-film" style={{ fontSize: '10px', color: '#D97706', letterSpacing: '0.06em' }}>
                ROL PENUH ({maxShots} FOTO)
              </span>
            </div>

            {/* Warm & Appreciative Headline */}
            <h1 className="font-display-serif" style={{ fontSize: '27px', lineHeight: 1.2, color: '#FFFFFF', marginBottom: '6px', fontWeight: 700 }}>
              Terima Kasih, <span style={{ color: '#D97706' }}>{guestName}</span>
            </h1>

            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '13px', lineHeight: 1.5, maxWidth: '320px', margin: '0 auto 14px' }}>
              {Math.max(shotCount, myPhotos.length)} fotomu kini tersimpan abadi di album kenangan <strong>{event?.coupleOrHost || event?.title || 'tuan rumah'}</strong>.
            </p>

            {/* Subtle Voice/Video Status or Recorder */}
            {(() => {
              const isVideoWishTier = event?.closingWishType === 'video' || event?.packageTier === 'wedding' || event?.packageTier === 'unlimited';

              if (isVideoWishTier) {
                if (hasSentVideoWish) {
                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#86EFAC',
                      fontSize: '11.5px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.22)',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      marginBottom: '14px'
                    }}>
                      <Check size={12} color="#22C55E" />
                      <span>Video ucapan tersimpan di galeri</span>
                    </div>
                  );
                }

                return (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <VideoWishRecorder
                      eventId={event?.id || eventId}
                      guestName={guestName}
                      coupleOrHost={event?.coupleOrHost || event?.title || 'Tuan Rumah'}
                      onSuccess={() => {
                        setHasSentVideoWish(true);
                        const canonicalId = event?.id || eventId;
                        try {
                          localStorage.setItem(`sb_has_sent_video_${canonicalId}`, 'true');
                          localStorage.setItem(`sb_has_sent_video_${eventId}`, 'true');
                        } catch {}
                      }}
                      onSkipTextWish={() => {
                        setHasSentVideoWish(true);
                        const canonicalId = event?.id || eventId;
                        try {
                          localStorage.setItem(`sb_has_sent_video_${canonicalId}`, 'true');
                          localStorage.setItem(`sb_has_sent_video_${eventId}`, 'true');
                        } catch {}
                      }}
                    />
                  </div>
                );
              }

              // Standard Voice Note Tier
              if (event?.allowVoiceNote !== false && !hasSentVoice) {
                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    marginBottom: '16px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    <strong style={{ fontSize: '12.5px', color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                      Tinggalkan Ucapan Suara untuk {event?.coupleOrHost || 'Tuan Rumah'}
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
                            padding: '8px 18px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px'
                          }}
                        >
                          {isRecording ? <Square size={13} /> : <Mic size={13} />}
                          <span>{isRecording ? `Merekam (${recordDuration}s / 15s) - Stop` : 'Rekam Pesan Suara (15s)'}</span>
                        </button>
                        {isRecording && (
                          <span style={{ fontSize: '10.5px', color: '#F87171', display: 'block', marginTop: '6px' }}>
                            ● Sedang merekam...
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', color: '#4ADE80' }}>✓ Rekaman siap kirim ({recordDuration}s)</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={submitVoiceNote}
                            disabled={isUploadingAudio}
                            style={{
                              background: '#C27803',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '9px',
                              padding: '7px 14px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {isUploadingAudio ? 'Mengirim...' : 'Kirim'}
                          </button>
                          <button
                            onClick={() => setAudioBlob(null)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.15)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '9px',
                              padding: '7px 12px',
                              fontSize: '11.5px',
                              cursor: 'pointer'
                            }}
                          >
                            Ulangi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (hasSentVoice) {
                return (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#86EFAC',
                    fontSize: '11px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.22)',
                    padding: '3px 11px',
                    borderRadius: '999px',
                    marginBottom: '14px'
                  }}>
                    <Check size={12} color="#22C55E" />
                    <span>Pesan suara tersimpan untuk {event?.coupleOrHost || 'tuan rumah'}</span>
                  </div>
                );
              }

              return null;
            })()}

            {/* Mini Film Strip Preview (Showcase Guest Photos directly, tap to inspect) */}
            {myPhotos.length > 0 && (
              <div style={{ width: '100%', marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '2px 2px 6px',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {myPhotos.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      onClick={() => {
                        setPreviewPhoto(p);
                        setPreviewSlideDirection(0);
                      }}
                      style={{
                        flexShrink: 0,
                        width: '68px',
                        height: '90px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        cursor: 'pointer',
                        position: 'relative',
                        background: '#1A1815'
                      }}
                    >
                      <img src={p.imageData} alt={`Shot #${p.shotNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '3px',
                        fontSize: '8px',
                        fontFamily: 'var(--font-mono)',
                        color: '#FFFFFF',
                        background: 'rgba(0,0,0,0.75)',
                        padding: '1px 3px',
                        borderRadius: '3px'
                      }}>
                        #{p.shotNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Action Buttons (Concise, Clean, High Contrast) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
              <button
                onClick={() => setShowRollModal(true)}
                style={{
                  background: '#FFFFFF',
                  color: '#1D1D1F',
                  width: '100%',
                  padding: '13px',
                  borderRadius: '13px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <Eye size={16} />
                <span>Buka & Simpan Foto Saya ({Math.max(shotCount, myPhotos.length)})</span>
              </button>

              <Link
                href={`/event/${eventId}`}
                style={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  padding: '9px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={14} />
                <span>Lihat Galeri Bersama Acara →</span>
              </Link>
            </div>

            {/* Tasteful Product-Led Growth (Natural & Understated) */}
            <div style={{
              marginTop: '20px',
              width: '100%',
              maxWidth: '320px',
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#FFFFFF' }}>
                  Hadirkan Kamera di Acaramu
                </span>
                <Link
                  href="/create"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#D97706',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span>Mulai Sekarang</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.45, margin: 0 }}>
                Kamera tamu analog digital untuk pernikahan, ulang tahun, atau perayaan spesial tanpa instal aplikasi.
              </p>
            </div>

            {/* Vendor Partner Attribution (if applicable) */}
            {event?.vendorName && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.45)', fontSize: '10.5px' }}>
                {event.vendorLogo && (
                  <img src={event.vendorLogo} alt={event.vendorName} style={{ height: '14px', maxWidth: '50px', objectFit: 'contain' }} />
                )}
                <span>Partner WO: <strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{event.vendorName}</strong></span>
              </div>
            )}
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
            {event?.coupleOrHost || event?.title || 'SudutBingkai Acara'}
          </span>
        </div>

        <h1 className="font-display-serif" style={{ fontSize: '26px', lineHeight: 1.2, marginBottom: '10px', color: '#1D1D1F' }}>
          Kamera Tamu <em>Digital</em>
        </h1>

        <p style={{ color: '#515154', fontSize: '13px', lineHeight: 1.6, marginBottom: '22px' }}>
          Jepret momen spontan dan seru bersama para tamu. Foto langsung tersimpan ke album {event?.coupleOrHost || 'tuan rumah'} tanpa unduh aplikasi.
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
              placeholder="Ketik nama Anda (misal: Rian)"
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

        {event?.vendorName && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#86868B', fontSize: '11px' }}>
            {event.vendorLogo ? (
              <img src={event.vendorLogo} alt={event.vendorName} style={{ height: '16px', maxWidth: '64px', objectFit: 'contain' }} />
            ) : null}
            <span>Partner: <strong style={{ color: '#1D1D1F' }}>{event.vendorName}</strong></span>
          </div>
        )}
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
              {event?.title || 'Kamera Tamu SudutBingkai'}
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

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
