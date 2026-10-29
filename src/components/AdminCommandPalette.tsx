'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search, Calendar, Camera, Users, DollarSign,
  Shield, FileText, Wallet, Video, Tv, LogOut,
  RefreshCw, CheckCircle2, Sliders, ExternalLink
} from 'lucide-react';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTab: (tabSlug: string) => void;
}

export default function AdminCommandPalette({
  isOpen,
  onOpenChange,
  onSelectTab
}: AdminCommandPaletteProps) {
  const router = useRouter();

  // Keyboard shortcut listener: Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, onOpenChange]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-black/10 text-[#1D1D1F]"
        style={{ background: '#FAF8F5' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Admin Command Palette" className="w-full">
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5 bg-white">
            <Search size={18} className="text-[#86868B]" />
            <Command.Input
              autoFocus
              placeholder="Ketik menu atau aksi admin... (contoh: acara, invoice, vendor)"
              className="w-full bg-transparent border-none outline-none text-[14px] text-[#1D1D1F] placeholder:text-[#86868B]"
            />
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#86868B] bg-black/5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-[13px] text-[#86868B]">
              Tidak ada menu atau perintah yang cocok.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group heading="Navigasi Menu Utama" className="text-[11px] font-bold text-[#86868B] px-2 py-1.5 uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  onSelectTab('overview');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <DollarSign size={16} />
                <span className="text-[13px] font-medium flex-1">Ringkasan Finansial & Dashboard</span>
                <span className="text-[11px] text-[#86868B]">/overview</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('events');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Calendar size={16} />
                <span className="text-[13px] font-medium flex-1">Manajemen Acara & Paket</span>
                <span className="text-[11px] text-[#86868B]">/events</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('hosts');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Users size={16} />
                <span className="text-[13px] font-medium flex-1">Akun Klien / Pengantin</span>
                <span className="text-[11px] text-[#86868B]">/hosts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('moderation');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Shield size={16} />
                <span className="text-[13px] font-medium flex-1">Moderasi Foto, Video & Audio</span>
                <span className="text-[11px] text-[#86868B]">/moderation</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('vendors');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Camera size={16} />
                <span className="text-[13px] font-medium flex-1">Mitra Vendor & Wedding Organizer</span>
                <span className="text-[11px] text-[#86868B]">/vendors</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('invoices');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <FileText size={16} />
                <span className="text-[13px] font-medium flex-1">Tagihan & Invoice Mayar</span>
                <span className="text-[11px] text-[#86868B]">/invoices</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('payouts');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Wallet size={16} />
                <span className="text-[13px] font-medium flex-1">Pencairan Dana Komisi (Payouts)</span>
                <span className="text-[11px] text-[#86868B]">/payouts</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectTab('testimonials');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803] transition-colors"
              >
                <Video size={16} />
                <span className="text-[13px] font-medium flex-1">Video Testimonial Klien</span>
                <span className="text-[11px] text-[#86868B]">/testimonials</span>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions Group */}
            <Command.Group heading="Aksi Cepat" className="text-[11px] font-bold text-[#86868B] px-2 py-1.5 uppercase tracking-wider mt-2 border-t border-black/5">
              <Command.Item
                onSelect={() => {
                  window.location.reload();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803]"
              >
                <RefreshCw size={15} />
                <span className="text-[13px] font-medium flex-1">Segarkan Semua Data Realtime</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  window.open('/admin/health', '_blank');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-black/5 aria-selected:bg-amber-500/10 aria-selected:text-[#C27803]"
              >
                <Shield size={15} />
                <span className="text-[13px] font-medium flex-1">Cek Health Status Sistem & Storage S3</span>
                <ExternalLink size={12} className="text-[#86868B]" />
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer note */}
          <div className="px-4 py-2 bg-black/[0.02] border-t border-black/5 flex items-center justify-between text-[11px] text-[#86868B]">
            <span>Gunakan tombol panah ↑ ↓ untuk memilih, tekan Enter untuk membuka</span>
            <span className="font-mono">SudutBingkai Admin v2</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
