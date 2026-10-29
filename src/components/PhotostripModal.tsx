'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, RefreshCw, Check, Film, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { generatePhotostripCanvas } from '@/lib/photostrip';

interface PhotostripModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePhotos: Array<{ id: string; url: string; shotNumber?: number }>;
  eventTitle: string;
  coupleOrHost?: string;
  dateStr?: string;
}

export default function PhotostripModal({
  isOpen,
  onClose,
  availablePhotos,
  eventTitle,
  coupleOrHost,
  dateStr
}: PhotostripModalProps) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'cream' | 'dark' | 'kraft' | 'amber'>('cream');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize with first 4 photos
  useEffect(() => {
    if (isOpen && availablePhotos.length > 0) {
      const initial = availablePhotos.slice(0, 4).map(p => p.id);
      setSelectedPhotoIds(initial);
    }
  }, [isOpen, availablePhotos]);

  // Generate canvas preview whenever selection or theme changes
  useEffect(() => {
    if (!isOpen || selectedPhotoIds.length === 0) return;

    let isMounted = true;
    const generate = async () => {
      setIsGenerating(true);
      try {
        const photoUrls = selectedPhotoIds
          .map(id => availablePhotos.find(p => p.id === id)?.url)
          .filter((url): url is string => Boolean(url));

        if (photoUrls.length === 0) return;

        const canvas = await generatePhotostripCanvas({
          photos: photoUrls,
          eventTitle,
          coupleOrHost,
          dateStr,
          theme
        });

        if (isMounted) {
          canvasRef.current = canvas;
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.92));
        }
      } catch (err) {
        console.warn('Photostrip generation error:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedPhotoIds, theme, availablePhotos, eventTitle, coupleOrHost, dateStr]);

  if (!isOpen) return null;

  const toggleSelectPhoto = (id: string) => {
    if (selectedPhotoIds.includes(id)) {
      if (selectedPhotoIds.length <= 1) {
        toast.info('Pilih minimal 1 foto untuk photostrip.');
        return;
      }
      setSelectedPhotoIds(prev => prev.filter(pId => pId !== id));
    } else {
      if (selectedPhotoIds.length >= 4) {
        toast.info('Maksimal 4 foto untuk 1 strip (Life Four Cuts).');
        return;
      }
      setSelectedPhotoIds(prev => [...prev, id]);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    try {
      const link = document.createElement('a');
      link.download = `photostrip-${(coupleOrHost || eventTitle).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
      toast.success('Photostrip 4-Frame resolusi cetak berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh photostrip.');
    }
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'photostrip.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Photostrip 4-Frame ${coupleOrHost || eventTitle}`,
            text: `Kenangan photostrip 4-frame di acara ${eventTitle}`,
            files: [file]
          });
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden rounded-[28px] shadow-2xl border border-black/10"
        style={{ background: '#FBFBFA' }}
      >
        {/* Left Side: Live Photostrip Preview */}
        <div 
          className="flex-1 min-h-[360px] md:min-h-[560px] p-6 flex flex-col items-center justify-center relative overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #F0EAE1 0%, #E8E1D5 100%)' }}
        >
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-[#C27803]">
              <RefreshCw size={28} className="animate-spin" />
              <span className="font-mono text-[12px] font-bold tracking-wider">MEMPROSES STRIP...</span>
            </div>
          ) : previewDataUrl ? (
            <div className="relative group max-w-[220px] md:max-w-[260px] shadow-2xl rounded-xl overflow-hidden border border-black/10 transition-transform">
              <img 
                src={previewDataUrl} 
                alt="Photostrip 4-Frame Preview" 
                className="w-full h-auto block"
              />
            </div>
          ) : (
            <span className="text-[#86868B] text-[13px]">Belum ada foto yang dipilih</span>
          )}
        </div>

        {/* Right Side: Customization & Photo Picker */}
        <div className="w-full md:w-[380px] p-6 flex flex-col justify-between overflow-y-auto bg-white border-t md:border-t-0 md:border-l border-black/5">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#C27803]"
                  style={{ background: 'rgba(194, 120, 3, 0.12)' }}
                >
                  <Film size={16} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1D1D1F] m-0">Photostrip 4-Frame</h3>
                  <span className="text-[11px] text-[#86868B]">Korean Life Four Cuts Style</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Theme Selector */}
            <div className="mt-4">
              <label className="text-[11.5px] font-bold text-[#1D1D1F] block mb-2">Pilihan Warna Strip</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cream', name: 'Cream', bg: '#FBFBFA', border: '#E5E5EA' },
                  { id: 'dark', name: 'Dark', bg: '#181715', border: '#3A3835' },
                  { id: 'kraft', name: 'Kraft', bg: '#ECE5D8', border: '#D0C7B7' },
                  { id: 'amber', name: 'Amber', bg: '#FFF8EE', border: '#EBD4B2' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className="p-2 rounded-xl flex flex-col items-center gap-1.5 transition-all"
                    style={{
                      background: theme === t.id ? 'rgba(194, 120, 3, 0.12)' : 'rgba(0, 0, 0, 0.02)',
                      border: theme === t.id ? '1.5px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full shadow-inner border"
                      style={{ background: t.bg, borderColor: t.border }}
                    />
                    <span className="text-[10px] font-bold text-[#1D1D1F]">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Selection Grid */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11.5px] font-bold text-[#1D1D1F]">
                  Pilih 4 Foto ({selectedPhotoIds.length}/4)
                </label>
                <span className="text-[10.5px] text-[#86868B]">Ketuk untuk ubah urutan</span>
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-[190px] overflow-y-auto p-1">
                {availablePhotos.map((photo, idx) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const orderIndex = selectedPhotoIds.indexOf(photo.id);

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => toggleSelectPhoto(photo.id)}
                      className="relative aspect-square rounded-xl overflow-hidden border transition-all"
                      style={{
                        borderColor: isSelected ? '#C27803' : 'transparent',
                        boxShadow: isSelected ? '0 0 0 2px #C27803' : 'none'
                      }}
                    >
                      <img 
                        src={photo.url} 
                        alt={`Foto ${photo.shotNumber || idx + 1}`}
                        className="w-full h-full object-cover" 
                      />
                      {isSelected && (
                        <div 
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow"
                          style={{ background: '#C27803' }}
                        >
                          {orderIndex + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-black/5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || selectedPhotoIds.length === 0}
              className="w-full py-3 rounded-full text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
              style={{ background: '#C27803' }}
            >
              <Download size={15} />
              <span>Unduh Photostrip Cetak HD</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isGenerating || selectedPhotoIds.length === 0}
              className="glass-pill w-full py-2.5 text-[12.5px] font-semibold text-[#1D1D1F] flex items-center justify-center gap-2 hover:bg-black/5"
            >
              <Share2 size={14} />
              <span>Bagikan (WhatsApp / IG Stories)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
