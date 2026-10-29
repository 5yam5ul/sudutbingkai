'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { Check, X, Film, Info } from 'lucide-react';
import { FILM_PRESETS } from '@/lib/filters';
import { FilmPresetId } from '@/lib/types';
import { hapticDialClick } from '@/lib/haptics';

interface FilmPresetDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPreset: FilmPresetId;
  availablePresets: FilmPresetId[];
  onSelectPreset: (preset: FilmPresetId) => void;
  canSwitch: boolean;
}

export default function FilmPresetDrawer({
  isOpen,
  onOpenChange,
  selectedPreset,
  availablePresets,
  onSelectPreset,
  canSwitch
}: FilmPresetDrawerProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" 
          style={{ backdropFilter: 'blur(6px)' }}
        />
        <Drawer.Content 
          className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col rounded-t-[32px] focus:outline-none"
          style={{
            background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EB 100%)',
            borderTop: '1px solid rgba(194, 120, 3, 0.25)',
            boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Top Pill Drag Handle */}
          <div className="pt-3 pb-2 flex justify-center">
            <div 
              className="w-12 h-1.5 rounded-full"
              style={{ background: 'rgba(0, 0, 0, 0.18)' }}
            />
          </div>

          {/* Drawer Header */}
          <div className="px-6 pt-2 pb-3 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(194, 120, 3, 0.12)', color: '#C27803' }}
              >
                <Film size={16} />
              </div>
              <div>
                <Drawer.Title className="text-[16px] font-bold text-[#1D1D1F] tracking-tight">
                  Pilih Emulasi Rol Film
                </Drawer.Title>
                <p className="text-[12px] text-[#86868B] m-0">
                  {canSwitch && availablePresets.length > 1
                    ? 'Pilih karakter warna analog untuk jepretan Anda berikutnya'
                    : 'Karakter emulasi film analog resmi yang digunakan di acara ini'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* Presets List */}
          <div className="px-5 py-4 overflow-y-auto max-h-[60vh] flex flex-col gap-2.5">
            {availablePresets.map((presetKey) => {
              const preset = FILM_PRESETS[presetKey] || FILM_PRESETS.portra;
              const isSelected = selectedPreset === presetKey;

              return (
                <button
                  key={presetKey}
                  type="button"
                  disabled={!canSwitch && !isSelected}
                  onClick={() => {
                    if (canSwitch) {
                      hapticDialClick();
                      onSelectPreset(presetKey);
                      onOpenChange(false);
                    }
                  }}
                  className="w-full text-left p-3.5 rounded-[20px] transition-all flex items-center justify-between"
                  style={{
                    background: isSelected 
                      ? 'rgba(194, 120, 3, 0.12)' 
                      : 'rgba(255, 255, 255, 0.85)',
                    border: isSelected 
                      ? '1.5px solid #C27803' 
                      : '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: isSelected 
                      ? '0 4px 16px rgba(194, 120, 3, 0.15)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.02)',
                    cursor: canSwitch ? 'pointer' : 'default',
                    opacity: !canSwitch && !isSelected ? 0.5 : 1
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Canister Color Pill */}
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ 
                        background: preset.accentColor || '#C27803',
                        color: '#FFFFFF'
                      }}
                    >
                      <span className="font-mono text-[10px] font-black tracking-wider uppercase">
                        {preset.name.slice(0, 3)}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[14px] text-[#1D1D1F] font-bold">
                          {preset.name}
                        </strong>
                        {isSelected && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#C27803', color: '#FFFFFF' }}
                          >
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#6E6E73] m-0 line-clamp-1 mt-0.5">
                        {preset.description || 'Emulasi analog klasik dengan grain sinematik'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: '#C27803', color: '#FFFFFF' }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-black/20" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          {!canSwitch && (
            <div className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 text-[11.5px] text-[#92400E]">
              <Info size={14} className="flex-shrink-0" />
              <span>Pilihan rol film dikunci oleh penyelenggara acara ini untuk menjaga konsistensi album.</span>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
