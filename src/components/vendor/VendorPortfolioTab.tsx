'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Layers, BookOpen, Plus, Trash2, Edit3, 
  ExternalLink, Copy, Check, Upload, Image as ImageIcon, 
  Eye, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  Globe, MessageCircle, MapPin, Sliders, Music, Video,
  Shield, Award, Camera, Star, HelpCircle, FileText, ChevronRight,
  RotateCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { VendorPortfolioAlbum, VendorPortfolioTheme, VendorPortfolioTestimonial, VendorPortfolioFaq, VendorPortfolioVideo, UserAccount } from '@/lib/types';
import { authFetch } from '@/lib/auth';
import { toast } from 'sonner';

interface VendorPortfolioTabProps {
  vendor: UserAccount;
  onUpdateVendor?: (updates: Partial<UserAccount>) => void;
}

interface DriveSamplePhoto {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
}

const FONT_OPTIONS = [
  {
    key: 'sans',
    name: 'Modern Sans (Outfit)',
    category: 'MINIMAL MODERN',
    fontFamily: 'var(--font-sans, "Outfit", sans-serif)',
    sample: 'Abadikan Momen Indah'
  },
  {
    key: 'serif',
    name: 'Cormorant Garamond',
    category: 'LUXURY EDITORIAL',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    sample: 'Romansa Elegan & Abadi'
  },
  {
    key: 'mono',
    name: 'JetBrains Mono',
    category: 'CINE ANALOG',
    fontFamily: 'var(--font-mono, monospace)',
    sample: 'ISO 400 • F/1.4 • EXP 2026'
  },
  {
    key: 'playfair',
    name: 'Playfair Display',
    category: 'GRAND WEDDING',
    fontFamily: 'var(--font-playfair, Georgia, serif)',
    sample: 'The Royal Wedding Chronicle'
  },
  {
    key: 'cinzel',
    name: 'Cinzel Roman',
    category: 'ROYAL EMPIRE',
    fontFamily: '"Cinzel", "Times New Roman", serif',
    sample: 'EXQUISITE LUXURY ATELIER'
  },
  {
    key: 'syne',
    name: 'Syne Avant-Garde',
    category: 'CREATIVE ART',
    fontFamily: '"Syne", sans-serif',
    sample: 'Visual Poetry & Design'
  },
  {
    key: 'jakarta',
    name: 'Plus Jakarta Sans',
    category: 'ARCHITECTURAL',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    sample: 'Minimalist Studio Showcase'
  }
];

function renderGridLayoutWireframe(key: string, isSelected: boolean) {
  const accent = isSelected ? '#F59E0B' : '#94A3B8';
  const subAccent = isSelected ? '#D97706' : '#64748B';

  if (key === 'grid') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '100%', height: '52px' }}>
        <div style={{ background: accent, borderRadius: '4px' }} />
        <div style={{ background: accent, borderRadius: '4px' }} />
        <div style={{ background: accent, borderRadius: '4px' }} />
        <div style={{ background: accent, borderRadius: '4px' }} />
        <div style={{ background: accent, borderRadius: '4px' }} />
        <div style={{ background: accent, borderRadius: '4px' }} />
      </div>
    );
  }

  if (key === 'masonry') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '100%', height: '52px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ height: '30px', background: accent, borderRadius: '4px' }} />
          <div style={{ height: '18px', background: accent, borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ height: '18px', background: accent, borderRadius: '4px' }} />
          <div style={{ height: '30px', background: accent, borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ height: '26px', background: accent, borderRadius: '4px' }} />
          <div style={{ height: '22px', background: accent, borderRadius: '4px' }} />
        </div>
      </div>
    );
  }

  if (key === 'filmstrip') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', height: '52px', padding: '0 4px', borderTop: '2px dashed rgba(255,255,255,0.25)', borderBottom: '2px dashed rgba(255,255,255,0.25)' }}>
        <div style={{ width: '38px', height: '38px', background: accent, borderRadius: '4px', flexShrink: 0 }} />
        <div style={{ width: '38px', height: '38px', background: accent, borderRadius: '4px', flexShrink: 0 }} />
        <div style={{ width: '38px', height: '38px', background: accent, borderRadius: '4px', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: accent, fontWeight: 800 }}>➔</span>
      </div>
    );
  }

  if (key === 'fullwidth_rows') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', height: '52px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', height: '20px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '100%', background: accent, borderRadius: '4px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ height: '6px', width: '80%', background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
            <div style={{ height: '4px', width: '50%', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', height: '20px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '100%', background: accent, borderRadius: '4px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ height: '6px', width: '70%', background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
            <div style={{ height: '4px', width: '40%', background: 'rgba(255,255,255,0.4)', borderRadius: '2px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (key === 'bento_mosaic') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4px', width: '100%', height: '52px' }}>
        <div style={{ height: '100%', background: accent, borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
          <div style={{ height: '50%', background: subAccent, borderRadius: '4px' }} />
          <div style={{ height: '50%', background: subAccent, borderRadius: '4px' }} />
        </div>
      </div>
    );
  }

  if (key === 'carousel_stage') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', height: '52px' }}>
        <div style={{ width: '18px', height: '34px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
        <div style={{ width: '80px', height: '46px', background: accent, borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
        <div style={{ width: '18px', height: '34px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
      </div>
    );
  }

  if (key === 'compact_list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', height: '52px', justifyContent: 'center' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: accent, borderRadius: '2px' }} />
            <div style={{ height: '4px', flex: 1, background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
            <div style={{ width: '16px', height: '6px', background: subAccent, borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    );
  }

  // diagonal_flow
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%', height: '52px', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ height: '22px', background: accent, borderRadius: '4px' }} />
        <div style={{ height: '20px', background: accent, borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', transform: 'translateY(6px)' }}>
        <div style={{ height: '22px', background: subAccent, borderRadius: '4px' }} />
        <div style={{ height: '18px', background: subAccent, borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function renderHeroStyleWireframe(key: string, isSelected: boolean) {
  const accent = isSelected ? '#F59E0B' : '#94A3B8';
  const subAccent = isSelected ? '#D97706' : '#64748B';

  if (key === 'social') {
    return (
      <div style={{ width: '100%', height: '52px', position: 'relative' }}>
        <div style={{ width: '100%', height: '34px', background: accent, borderRadius: '4px' }} />
        <div style={{ position: 'absolute', bottom: '2px', left: '8px', width: '22px', height: '22px', borderRadius: '50%', background: '#FFFFFF', border: `2px solid ${subAccent}` }} />
        <div style={{ position: 'absolute', bottom: '8px', left: '36px', height: '5px', width: '50px', background: 'rgba(255,255,255,0.8)', borderRadius: '2px' }} />
      </div>
    );
  }

  if (key === 'cinematic_fullscreen') {
    return (
      <div style={{ width: '100%', height: '52px', background: '#1E293B', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', border: `1px solid ${accent}` }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: accent }} />
        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.8)', borderRadius: '2px' }} />
      </div>
    );
  }

  if (key === 'split') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%', height: '52px' }}>
        <div style={{ height: '100%', background: accent, borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: subAccent }} />
          <div style={{ width: '80%', height: '5px', background: 'rgba(255,255,255,0.8)', borderRadius: '2px' }} />
          <div style={{ width: '50%', height: '3px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
        </div>
      </div>
    );
  }

  if (key === 'minimalist') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', height: '52px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: accent }} />
        <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.8)', borderRadius: '2px' }} />
        <div style={{ width: '40px', height: '3px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
      </div>
    );
  }

  if (key === 'floating_island') {
    return (
      <div style={{ width: '100%', height: '52px', position: 'relative' }}>
        <div style={{ width: '100%', height: '36px', background: accent, borderRadius: '4px' }} />
        <div style={{ position: 'absolute', bottom: '0px', left: '15%', right: '15%', height: '24px', background: '#1E293B', borderRadius: '8px', border: `1px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: accent }} />
          <div style={{ width: '30px', height: '4px', background: '#FFFFFF', borderRadius: '2px' }} />
        </div>
      </div>
    );
  }

  if (key === 'story_headline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', height: '52px' }}>
        <div style={{ width: '30px', height: '1px', background: accent }} />
        <div style={{ width: '85%', height: '8px', background: accent, borderRadius: '2px' }} />
        <div style={{ width: '55%', height: '4px', background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
        <div style={{ width: '30px', height: '1px', background: accent }} />
      </div>
    );
  }

  if (key === 'side_dock') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', width: '100%', height: '52px' }}>
        <div style={{ height: '100%', background: accent, borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FFFFFF' }} />
          <div style={{ width: '14px', height: '3px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
        </div>
        <div style={{ height: '100%', background: subAccent, borderRadius: '4px' }} />
      </div>
    );
  }

  // polaroid_stacked
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%', height: '52px', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: accent }} />
        <div style={{ width: '70%', height: '4px', background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
      </div>
      <div style={{ position: 'relative', width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: '22px', height: '28px', background: '#FFFFFF', borderRadius: '2px', border: '1px solid #CBD5E1', transform: 'rotate(-12deg)' }} />
        <div style={{ position: 'absolute', width: '22px', height: '28px', background: accent, borderRadius: '2px', border: '1px solid #CBD5E1', transform: 'rotate(0deg)', zIndex: 2 }} />
        <div style={{ position: 'absolute', width: '22px', height: '28px', background: '#FFFFFF', borderRadius: '2px', border: '1px solid #CBD5E1', transform: 'rotate(12deg)', zIndex: 1 }} />
      </div>
    </div>
  );
}

function renderVideoHighlightWireframe(key: string, isSelected: boolean) {
  const accent = isSelected ? '#F59E0B' : '#94A3B8';
  const subAccent = isSelected ? '#D97706' : '#64748B';

  if (key === 'carousel_slider') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '52px', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}>
          <span style={{ fontSize: '9px', color: subAccent }}>◀</span>
          <div style={{ width: '74px', height: '36px', background: accent, borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '0', height: '0', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '7px solid #FFF' }} />
          </div>
          <span style={{ fontSize: '9px', color: subAccent }}>▶</span>
        </div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
          <div style={{ width: '8px', height: '3px', background: accent, borderRadius: '999px' }} />
          <div style={{ width: '3px', height: '3px', background: subAccent, borderRadius: '999px' }} />
          <div style={{ width: '3px', height: '3px', background: subAccent, borderRadius: '999px' }} />
        </div>
      </div>
    );
  }

  if (key === 'cinema_imax') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '52px', position: 'relative' }}>
        <div style={{ width: '100%', height: '36px', background: accent, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${accent}66` }}>
          <div style={{ width: '0', height: '0', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #FFF' }} />
        </div>
        <div style={{ width: '55%', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px', marginTop: '4px' }} />
      </div>
    );
  }

  if (key === 'side_split') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '5px', width: '100%', height: '52px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ width: '45%', height: '3px', background: subAccent, borderRadius: '2px' }} />
          <div style={{ width: '90%', height: '5px', background: '#FFF', borderRadius: '2px' }} />
          <div style={{ width: '65%', height: '3px', background: 'rgba(255,255,255,0.6)', borderRadius: '2px' }} />
        </div>
        <div style={{ height: '38px', background: accent, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '0', height: '0', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid #FFF' }} />
        </div>
      </div>
    );
  }

  // bento_grid
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '100%', height: '52px', alignItems: 'center' }}>
      <div style={{ height: '34px', background: accent, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '0', height: '0', borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid #FFF' }} />
      </div>
      <div style={{ height: '34px', background: subAccent, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '0', height: '0', borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid #FFF' }} />
      </div>
      <div style={{ height: '34px', background: subAccent, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '0', height: '0', borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid #FFF' }} />
      </div>
    </div>
  );
}

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function TikTokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.87-4.47V8.71a8.28 8.28 0 0 0 4.9 1.58V6.85a4.8 4.8 0 0 1-1-.16z"/>
    </svg>
  );
}

export default function VendorPortfolioTab({ vendor, onUpdateVendor }: VendorPortfolioTabProps) {
  // Navigation inside tab
  const [activeSubTab, setActiveSubTab] = useState<'albums' | 'style' | 'atmosphere' | 'profile' | 'features'>('albums');

  // Form profile states
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [albums, setAlbums] = useState<VendorPortfolioAlbum[]>([]);
  
  // Theme customization state
  const [theme, setTheme] = useState<VendorPortfolioTheme>({
    cardStyle: 'photobook',
    backgroundMode: 'preset',
    bgPreset: 'alabaster',
    heroStyle: 'social',
    gridLayout: 'grid',
    slideshowTransition: 'flipbook',
    fontStyle: 'sans',
    accentColor: '#C27803',
    enableStickyMobileBar: true,
    showTestimonials: false,
    showFaq: false,
    showBadges: false,
    showBehindTheLens: false,
    showVideoHighlight: false,
    watermarkEnabled: false,
    disableRightClick: false,
    enableLeadForm: true
  });

  // UI states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal Add/Edit Album states
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumDriveUrl, setAlbumDriveUrl] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [coverSource, setCoverSource] = useState<'drive' | 'custom'>('drive');
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);

  // Drive test & thumbnail picker states
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [drivePhotos, setDrivePhotos] = useState<DriveSamplePhoto[]>([]);
  const [driveCheckError, setDriveCheckError] = useState<string | null>(null);

  // File Input Refs
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const albumCoverInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const photographerAvatarInputRef = useRef<HTMLInputElement>(null);

  // Card Flip and Font Picker States
  const [flippedGridCard, setFlippedGridCard] = useState<string | null>(null);
  const [flippedHeroCard, setFlippedHeroCard] = useState<string | null>(null);
  const [flippedVideoCard, setFlippedVideoCard] = useState<string | null>(null);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);

  // Temporary item inputs for sub-features
  const [newBadgeText, setNewBadgeText] = useState('');
  const [newGearText, setNewGearText] = useState('');
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newTestiClient, setNewTestiClient] = useState('');
  const [newTestiQuote, setNewTestiQuote] = useState('');
  const [newTestiDate, setNewTestiDate] = useState('');

  // Initialize data
  useEffect(() => {
    if (vendor?.id) {
      const initialSlug = vendor.slug || (vendor.companyName || vendor.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setSlug(initialSlug);
      if (vendor.bio) setBio(vendor.bio);
      if (vendor.coverUrl) setCoverUrl(vendor.coverUrl);
      if (vendor.whatsapp || vendor.phone) setWhatsapp(vendor.whatsapp || vendor.phone || '');
      if (vendor.website) setWebsite(vendor.website);
      if (vendor.instagram) setInstagram(vendor.instagram);
      if (Array.isArray(vendor.portfolioAlbums) && vendor.portfolioAlbums.length > 0) {
        setAlbums(vendor.portfolioAlbums);
      }
      if (vendor.portfolioTheme) {
        setTheme(prev => ({ ...prev, ...vendor.portfolioTheme }));
      }
    }

    // Always fetch fresh portfolio directly from API (which reads Supabase)
    const targetUrl = vendor?.id 
      ? `/api/vendors/portfolio?vendorId=${encodeURIComponent(vendor.id)}` 
      : `/api/vendors/portfolio`;

    authFetch(targetUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.portfolio) {
          const p = data.portfolio;
          if (p.slug) setSlug(p.slug);
          if (p.bio !== undefined) setBio(p.bio);
          if (p.coverUrl !== undefined) setCoverUrl(p.coverUrl);
          if (p.whatsapp !== undefined) setWhatsapp(p.whatsapp);
          if (p.website !== undefined) setWebsite(p.website);
          if (p.instagram !== undefined) setInstagram(p.instagram);
          if (Array.isArray(p.albums)) {
            setAlbums(p.albums);
          }
          if (p.theme && typeof p.theme === 'object') {
            setTheme(prev => ({ ...prev, ...p.theme }));
          }
        }
      })
      .catch(err => console.warn('Portfolio load notice:', err));
  }, [vendor?.id]);

  const publicPortfolioUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${slug}` 
    : `https://sudutbingkai.id/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicPortfolioUrl);
    setCopiedLink(true);
    toast.success('Link landing page portofolio berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Cover Banner Upload (Base64)
  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar cover maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setCoverUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Album Cover Upload
  const handleAlbumCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar sampul album maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setAlbumCoverUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Background Image Upload
  const handleBgImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran gambar background maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setTheme(prev => ({
          ...prev,
          backgroundMode: 'image',
          bgImageUrl: base64
        }));
        toast.success('Wallpaper background berhasil diunggah!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Photographer Avatar Upload
  const handlePhotographerAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setTheme(prev => ({
          ...prev,
          behindTheLens: {
            ...prev.behindTheLens,
            avatarUrl: base64
          }
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Test Google Drive Folder URL
  const handleCheckDriveFolder = async () => {
    if (!albumDriveUrl.trim()) {
      toast.error('Masukkan link folder Google Drive terlebih dahulu');
      return;
    }

    setIsCheckingDrive(true);
    setDriveCheckError(null);
    setDrivePhotos([]);

    try {
      const res = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(albumDriveUrl.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membaca folder Google Drive.');
      }

      const files = data.photos || data.files || [];
      if (files.length === 0) {
        setDriveCheckError('Folder terbaca namun tidak ada file foto di dalamnya.');
        toast.warning('Folder kosong atau belum berisi foto.');
      } else {
        setDrivePhotos(files.slice(0, 8));
        if (!albumCoverUrl && files[0]?.url) {
          setAlbumCoverUrl(files[0].url);
        }
        setDriveCheckError(null);
        toast.success(`Berhasil! Ditemukan ${files.length} foto di dalam folder.`);
      }
    } catch (err: any) {
      console.error('Error checking drive folder:', err);
      setDriveCheckError(err.message || 'Pastikan link folder memiliki akses "Siapa saja yang memiliki link".');
      toast.error(err.message || 'Gagal memeriksa folder Google Drive');
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const openNewAlbumModal = () => {
    setEditingAlbumId(null);
    setAlbumTitle('');
    setAlbumDesc('');
    setAlbumDriveUrl('');
    setAlbumCoverUrl('');
    setDrivePhotos([]);
    setDriveCheckError(null);
    setCoverSource('drive');
    setAlbumModalOpen(true);
  };

  const openEditAlbumModal = (album: VendorPortfolioAlbum) => {
    setEditingAlbumId(album.id);
    setAlbumTitle(album.title);
    setAlbumDesc(album.description || '');
    setAlbumDriveUrl(album.driveFolderUrl);
    setAlbumCoverUrl(album.coverImageUrl);
    setDrivePhotos([]);
    setDriveCheckError(null);
    setCoverSource(album.coverImageUrl ? 'drive' : 'custom');
    setAlbumModalOpen(true);
  };

  // Save all profile, albums, and theme to backend
  const persistPortfolio = async (updatedAlbums?: VendorPortfolioAlbum[], updatedTheme?: VendorPortfolioTheme) => {
    const albumsToSave = updatedAlbums !== undefined ? updatedAlbums : albums;
    const themeToSave = updatedTheme !== undefined ? updatedTheme : theme;
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanSlug || cleanSlug.length < 2) {
      toast.error('Slug URL minimal 2 karakter (huruf, angka, strip)');
      return false;
    }

    try {
      const payload = {
        slug: cleanSlug,
        bio,
        coverUrl,
        whatsapp,
        website,
        instagram,
        albums: albumsToSave,
        theme: themeToSave
      };

      const res = await authFetch('/api/vendors/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan portofolio');
      }

      if (data.portfolio && Array.isArray(data.portfolio.albums)) {
        setAlbums(data.portfolio.albums);
      }
      if (data.portfolio && data.portfolio.theme) {
        setTheme(data.portfolio.theme);
      }

      if (onUpdateVendor) {
        onUpdateVendor({
          slug: cleanSlug,
          bio,
          coverUrl,
          whatsapp,
          website,
          portfolioAlbums: data.portfolio?.albums || albumsToSave,
          portfolioTheme: data.portfolio?.theme || themeToSave
        });
      }
      return true;
    } catch (err: any) {
      console.error('Error saving portfolio:', err);
      toast.error(err.message || 'Gagal menyimpan perubahan ke server');
      return false;
    }
  };

  const handleSaveAlbum = async () => {
    if (!albumTitle.trim()) {
      toast.error('Nama kategori/album wajib diisi');
      return;
    }
    if (!albumDriveUrl.trim()) {
      toast.error('Link folder Google Drive wajib diisi');
      return;
    }

    setIsSavingAlbum(true);
    let currentCover = albumCoverUrl || (drivePhotos[0]?.url || drivePhotos[0]?.fullUrl) || '';
    let resolvedPhotoCount = drivePhotos.length > 0 ? drivePhotos.length : undefined;

    // If user didn't click "Cek Foto" first, attempt automatic first-photo preview resolution
    if (!currentCover && albumDriveUrl.trim()) {
      try {
        const driveRes = await fetch(`/api/proofing/drive?folderId=${encodeURIComponent(albumDriveUrl.trim())}`);
        const driveData = await driveRes.json();
        const foundPhotos = driveData.photos || driveData.files || [];
        if (foundPhotos.length > 0) {
          currentCover = foundPhotos[0]?.url || foundPhotos[0]?.fullUrl || '';
          resolvedPhotoCount = foundPhotos.length;
        }
      } catch (e) {
        console.warn('Auto-cover fetch notice:', e);
      }
    }

    let updatedAlbums: VendorPortfolioAlbum[];
    if (editingAlbumId) {
      updatedAlbums = albums.map(a => a.id === editingAlbumId ? {
        ...a,
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        driveFolderUrl: albumDriveUrl.trim(),
        coverImageUrl: currentCover || a.coverImageUrl,
        photoCount: resolvedPhotoCount !== undefined ? resolvedPhotoCount : a.photoCount
      } : a);
    } else {
      const newAlbum: VendorPortfolioAlbum = {
        id: `alb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: albumTitle.trim(),
        description: albumDesc.trim(),
        driveFolderUrl: albumDriveUrl.trim(),
        coverImageUrl: currentCover,
        photoCount: resolvedPhotoCount,
        order: albums.length,
        createdAt: new Date().toISOString()
      };
      updatedAlbums = [...albums, newAlbum];
    }

    setAlbums(updatedAlbums);

    // Auto-save immediately to database
    const saved = await persistPortfolio(updatedAlbums);
    setIsSavingAlbum(false);

    if (saved) {
      toast.success(editingAlbumId ? 'Album berhasil diperbarui dan dipublikasikan!' : 'Album berhasil ditambahkan & langsung tayang di portofolio!');
      setAlbumModalOpen(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori album ini dari portofolio?')) {
      const updatedAlbums = albums.filter(a => a.id !== id);
      setAlbums(updatedAlbums);
      const saved = await persistPortfolio(updatedAlbums);
      if (saved) {
        toast.success('Album dihapus dari portofolio');
      }
    }
  };

  const handleSaveAllPortfolio = async () => {
    setIsSavingProfile(true);
    const saved = await persistPortfolio();
    setIsSavingProfile(false);
    if (saved) {
      toast.success('Pengaturan portofolio berhasil disimpan & dipublikasikan!');
    }
  };

  // Helper for adding Badges
  const handleAddBadge = () => {
    if (!newBadgeText.trim()) return;
    const currentBadges = theme.badges || [];
    setTheme(prev => ({
      ...prev,
      badges: [...currentBadges, newBadgeText.trim()]
    }));
    setNewBadgeText('');
  };

  const handleRemoveBadge = (idx: number) => {
    const currentBadges = theme.badges || [];
    setTheme(prev => ({
      ...prev,
      badges: currentBadges.filter((_, i) => i !== idx)
    }));
  };

  // Helper for adding Gear
  const handleAddGear = () => {
    if (!newGearText.trim()) return;
    const currentGears = theme.behindTheLens?.gearList || [];
    setTheme(prev => ({
      ...prev,
      behindTheLens: {
        ...prev.behindTheLens,
        gearList: [...currentGears, newGearText.trim()]
      }
    }));
    setNewGearText('');
  };

  const handleRemoveGear = (idx: number) => {
    const currentGears = theme.behindTheLens?.gearList || [];
    setTheme(prev => ({
      ...prev,
      behindTheLens: {
        ...prev.behindTheLens,
        gearList: currentGears.filter((_, i) => i !== idx)
      }
    }));
  };

  // Helper for adding FAQ
  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error('Pertanyaan dan jawaban FAQ harus diisi');
      return;
    }
    const currentFaqs = theme.faqs || [];
    setTheme(prev => ({
      ...prev,
      faqs: [...currentFaqs, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]
    }));
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleRemoveFaq = (idx: number) => {
    const currentFaqs = theme.faqs || [];
    setTheme(prev => ({
      ...prev,
      faqs: currentFaqs.filter((_, i) => i !== idx)
    }));
  };

  // Helper for adding Testimonial
  const handleAddTestimonial = () => {
    if (!newTestiClient.trim() || !newTestiQuote.trim()) {
      toast.error('Nama klien dan kutipan ulasan harus diisi');
      return;
    }
    const currentTestis = theme.testimonials || [];
    const newTesti: VendorPortfolioTestimonial = {
      id: `testi_${Date.now()}`,
      clientName: newTestiClient.trim(),
      quote: newTestiQuote.trim(),
      eventDate: newTestiDate.trim() || undefined,
      rating: 5
    };
    setTheme(prev => ({
      ...prev,
      testimonials: [...currentTestis, newTesti]
    }));
    setNewTestiClient('');
    setNewTestiQuote('');
    setNewTestiDate('');
  };

  const handleRemoveTestimonial = (id: string) => {
    const currentTestis = theme.testimonials || [];
    setTheme(prev => ({
      ...prev,
      testimonials: currentTestis.filter(t => t.id !== id)
    }));
  };

  // Video Highlights multiple helpers
  const currentVideoList: VendorPortfolioVideo[] = (theme.videoHighlights && theme.videoHighlights.length > 0)
    ? theme.videoHighlights
    : (theme.videoHighlightUrl
      ? [{ id: 'vid_1', url: theme.videoHighlightUrl, title: theme.videoHighlightTitle || 'Wedding Film Showcase', category: 'Cinematic Teaser' }]
      : []);

  const handleAddVideo = () => {
    const baseList = currentVideoList.length > 0 
      ? currentVideoList 
      : (theme.videoHighlightUrl ? [{ id: 'vid_1', url: theme.videoHighlightUrl, title: theme.videoHighlightTitle || 'Wedding Film Showcase', category: 'Cinematic Teaser' }] : []);
    const newVid: VendorPortfolioVideo = {
      id: `vid_${Date.now()}`,
      url: '',
      title: '',
      category: 'Wedding Highlight'
    };
    const updated = [...baseList, newVid];
    setTheme(prev => ({
      ...prev,
      videoHighlights: updated,
      videoHighlightUrl: updated[0]?.url || '',
      videoHighlightTitle: updated[0]?.title || ''
    }));
  };

  const handleUpdateVideo = (id: string, field: keyof VendorPortfolioVideo, val: string) => {
    const baseList = currentVideoList.length > 0 
      ? currentVideoList 
      : [{ id, url: theme.videoHighlightUrl || '', title: theme.videoHighlightTitle || '' }];
    const updated = baseList.map(v => v.id === id ? { ...v, [field]: val } : v);
    setTheme(prev => ({
      ...prev,
      videoHighlights: updated,
      videoHighlightUrl: updated[0]?.url || '',
      videoHighlightTitle: updated[0]?.title || ''
    }));
  };

  const handleRemoveVideo = (id: string) => {
    const updated = currentVideoList.filter(v => v.id !== id);
    setTheme(prev => ({
      ...prev,
      videoHighlights: updated,
      videoHighlightUrl: updated[0]?.url || '',
      videoHighlightTitle: updated[0]?.title || ''
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Live Google Fonts Preconnect for Visual Typography Preview */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />
      
      {/* 1. TOP HEADER BANNER CARD (SudutBingkai Signature Glass Card) */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700 }}>
                PORTOFOLIO EKSKLUSIF VENDOR
              </span>
              <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                0 Byte Server Storage
              </span>
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Tampilkan Karya Terbaik Anda dengan URL Personal & Google Drive
            </h2>
            
            <p style={{ color: '#6E6E73', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Kustomisasi tampilan portofolio Anda secara leluasa: pilih gaya buku album 3D/polaroid, warna tema latar belakang, hingga proteksi watermark foto.
            </p>

            {/* URL Pill Display */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.25)',
              fontSize: '12.5px',
              fontFamily: 'var(--font-mono)',
              color: '#8C5400'
            }}>
              <Globe size={14} color="#C27803" />
              <strong>{publicPortfolioUrl}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="glass-pill"
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                color: '#1D1D1F'
              }}
            >
              {copiedLink ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
              <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-apple-black"
              style={{
                padding: '12px 22px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Eye size={15} />
              <span>Buka Portofolio</span>
              <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </a>

            <button
              type="button"
              onClick={handleSaveAllPortfolio}
              disabled={isSavingProfile}
              style={{
                padding: '12px 22px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #C27803 0%, #D97706 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: isSavingProfile ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(194, 120, 3, 0.35)'
              }}
            >
              {isSavingProfile ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span>Publikasikan Kustomisasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS (Intuitive Switcher) */}
      <div className="horizontal-scroll-row" style={{ gap: '10px', paddingBottom: '4px' }}>
        {[
          { key: 'albums', label: `Kategori Album (${albums.length})`, icon: Layers },
          { key: 'style', label: 'Gaya Card & Grid', icon: BookOpen },
          { key: 'atmosphere', label: 'Suasana & Background', icon: Sparkles },
          { key: 'profile', label: 'Identitas & Header Hero', icon: Sliders },
          { key: 'features', label: 'Fitur Tambahan & Keamanan', icon: Shield }
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = activeSubTab === tabItem.key;
          return (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setActiveSubTab(tabItem.key as any)}
              className="glass-pill"
              style={{
                background: isActive ? '#1D1D1F' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#1D1D1F',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                border: isActive ? '1px solid #1D1D1F' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Icon size={14} color={isActive ? '#F59E0B' : '#86868B'} />
              <span>{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: KATALOG KATEGORI ALBUM */}
      {activeSubTab === 'albums' && (
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700 }}>
                  KATALOG KARYA
                </span>
                <span style={{ fontSize: '11.5px', color: '#86868B', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                  {albums.length} Kategori Album
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                Kategori Album Portofolio (Google Drive)
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                Setiap kategori berisi link folder Google Drive. Foto tampil dalam kartu thumbnail estetik dan dapat dibuka sebagai slideshow buku foto.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewAlbumModal}
              className="btn-apple-black"
              style={{
                padding: '11px 20px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Tambah Kategori / Album</span>
            </button>
          </div>

          {/* Albums List Grid */}
          {albums.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {albums.map((album, idx) => (
                <div
                  key={album.id}
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    background: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '160px', background: '#1D1D1F', overflow: 'hidden' }}>
                    {album.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={album.coverImageUrl} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>
                        <BookOpen size={32} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '2px 8px', borderRadius: '6px', color: '#FFFFFF', fontSize: '10.5px', fontWeight: 600 }}>
                      Album #{idx + 1}
                    </div>
                  </div>

                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#1D1D1F' }}>
                        {album.title}
                      </h4>
                      {album.description && (
                        <p style={{ fontSize: '12px', color: '#86868B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                          {album.description}
                        </p>
                      )}
                      <a href={album.driveFolderUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#C27803', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <ExternalLink size={11} />
                        <span>Buka Folder Google Drive</span>
                      </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => openEditAlbumModal(album)}
                        className="glass-pill"
                        style={{ flex: 1, padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlbum(album.id)}
                        className="glass-pill"
                        style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
              <BookOpen size={36} color="#86868B" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#1D1D1F' }}>Belum Ada Kategori Album</h4>
              <p style={{ fontSize: '13px', color: '#86868B', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                Tambahkan kategori seperti "Wedding Adat", "Prewedding", atau "Lamaran". Cukup tempel link folder Google Drive foto Anda.
              </p>
              <button type="button" onClick={openNewAlbumModal} className="btn-apple-black" style={{ padding: '9px 18px', fontSize: '12.5px', cursor: 'pointer' }}>
                + Tambah Album Pertama
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: GAYA CARD ALBUM & TATA LETAK GRID */}
      {activeSubTab === 'style' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card Style Selector */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                PILIHAN TAMPILAN KARTU ALBUM
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Gaya Desain Card Album
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                Pilih format visual kartu album foto saat dibuka oleh calon klien di landing page Anda.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                {
                  key: 'photobook',
                  title: '📖 3D Hardcover Photobook',
                  desc: 'Buku album fisik 3D dengan aksen lipatan tulang buku (spine), bookmark pita, dan efek tilt mewah.',
                  badge: 'Paling Populer'
                },
                {
                  key: 'polaroid',
                  title: '🎞️ Polaroid / Film Stack',
                  desc: 'Bingkai cetak polaroid vintage berlatar putih dengan efek sudut miring asimetris yang dinamis.',
                  badge: 'Estetik Retro'
                },
                {
                  key: 'editorial',
                  title: '🏛️ Editorial Magazine',
                  desc: 'Format vertikal elegan rasio 4:5 dengan nomor kurasi (Vol. 01) dan tipografi serif Leica.',
                  badge: 'Fine-Art High End'
                },
                {
                  key: 'cinematic',
                  title: '✨ Cinematic Glass',
                  desc: 'Rasio sinematik 16:9 modern dengan badge kaca buram transparan dan efek zoom perlahan.',
                  badge: 'Modern Clean'
                },
                {
                  key: 'film_slide',
                  title: '🎞️ 35mm Slide Transparency',
                  desc: 'Bingkai proyektor slide film 35mm dengan stempel kode film, frame counter, dan lubang sprocket autentik.',
                  badge: 'Analog Vintage'
                },
                {
                  key: 'floating_canvas',
                  title: '🖼️ Frameless Floating Canvas',
                  desc: 'Kanvas seni tanpa tepi dengan soft ambient drop-shadow tebal, hover elevation 3D, dan sudut halus lembut.',
                  badge: 'Minimal Art Gallery'
                },
                {
                  key: 'gallery_frame',
                  title: '🏛️ Museum Matted Frame',
                  desc: 'Bingkai pameran seni rupa dengan matboard putih luas passe-partout di sekeliling foto & plat kuningan.',
                  badge: 'Luxury Fine Art'
                },
                {
                  key: 'modern_pill',
                  title: '💊 Ultra-Curved Modern Capsule',
                  desc: 'Desain kurva rounded 32px futuristik dengan glassmorphism pill melayang dan gradient border halus.',
                  badge: 'Trend 2026'
                }
              ].map((styleOption) => {
                const isSelected = (theme.cardStyle || 'photobook') === styleOption.key;
                return (
                  <div
                    key={styleOption.key}
                    onClick={() => setTheme(prev => ({ ...prev, cardStyle: styleOption.key as any }))}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                      background: isSelected ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                      boxShadow: isSelected ? '0 8px 24px rgba(194, 120, 3, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: isSelected ? '#C27803' : '#86868B', fontWeight: 700 }}>
                        {styleOption.badge}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="#C27803" />}
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: '#1D1D1F' }}>
                      {styleOption.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                      {styleOption.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Layout Selector */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                SUSUNAN TATA LETAK GALERI
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Layout Grid Galeri
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              {[
                { key: 'grid', title: 'Standard Responsive Grid', desc: 'Susunan kartu kolom rapi simetris (2-3 kolom).' },
                { key: 'masonry', title: 'Masonry Pinterest', desc: 'Ketinggian kartu asimetris yang dinamis dan berjiwa seni.' },
                { key: 'filmstrip', title: 'Horizontal Filmstrip Reel', desc: 'Dapat digeser / swipe horizontal seperti klise rol film.' },
                { key: 'fullwidth_rows', title: 'Full-Width Rows', desc: 'Setiap kategori membentang 1 baris penuh dengan cerita karya.' },
                { key: 'bento_mosaic', title: 'Bento Mosaic Showcase', desc: 'Tata letak bento modern dengan kartu hero utama 2x2 dan kartu pendukung 1x1.' },
                { key: 'carousel_stage', title: 'Spotlight Carousel Stage', desc: 'Panggung carousel kartu 3D terpusat dengan tombol panah navigasi interaktif.' },
                { key: 'compact_list', title: 'Curated Archive Directory', desc: 'Daftar baris arsip kurasi minimalis dengan nomor seri & thumbnail estetik.' },
                { key: 'diagonal_flow', title: 'Offset Staggered Cascade', desc: 'Grid 2 kolom zig-zag bergeser vertikal selang-seling ala galeri kontemporer.' }
              ].map((gridOption) => {
                const isSelected = (theme.gridLayout || 'grid') === gridOption.key;
                const isFlipped = flippedGridCard === gridOption.key;
                return (
                  <div
                    key={gridOption.key}
                    onClick={() => {
                      setTheme(prev => ({ ...prev, gridLayout: gridOption.key as any }));
                      setFlippedGridCard(prev => prev === gridOption.key ? null : gridOption.key);
                    }}
                    style={{
                      perspective: '1000px',
                      minHeight: '170px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minHeight: '170px',
                      borderRadius: '16px',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}>
                      {/* FRONT FACE (Info & Title) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                        background: isSelected ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                        boxShadow: isSelected ? '0 8px 24px rgba(194, 120, 3, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: isSelected ? '#C27803' : '#86868B', fontWeight: 700 }}>
                              {isSelected ? '✓ Terpilih' : 'Layout Galeri'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#86868B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Denah</span>
                              <RotateCw size={11} />
                            </span>
                          </div>
                          <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                            {gridOption.title}
                          </h4>
                          <p style={{ fontSize: '11.5px', color: '#6E6E73', margin: 0, lineHeight: 1.4 }}>
                            {gridOption.desc}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '11px', color: '#86868B' }}>
                          <span style={{ color: '#C27803', fontWeight: 600 }}>Klik untuk putar & lihat denah</span>
                          <RotateCw size={12} color="#C27803" />
                        </div>
                      </div>

                      {/* BACK FACE (Architectural Wireframe Denah) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: isSelected ? '2px solid #C27803' : '1px solid #1D1D1F',
                        background: '#121214',
                        color: '#FFFFFF',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700, letterSpacing: '0.08em' }}>
                              DENAH STRUKTUR
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <RotateCw size={10} />
                              <span>Putar Balik</span>
                            </span>
                          </div>

                          {/* Wireframe Diagram */}
                          <div style={{ padding: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {renderGridLayoutWireframe(gridOption.key, isSelected)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {gridOption.title}
                          </span>
                          <span style={{ fontSize: '9.5px', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {isSelected ? '✓ Aktif' : 'Pilih'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: ANIMASI SLIDESHOW FOTO ALBUM */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TRANSISI MODAL VIEWER FOTO
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Gaya Animasi Slideshow Album
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                Pilih efek transisi visual saat calon klien membuka foto album di layar penuh. <strong>Default: 📖 3D Flipbook Photobook</strong>.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {[
                {
                  key: 'flipbook',
                  icon: '📖',
                  title: '3D Real Physical Photobook',
                  desc: 'Simulasi fisika kertas nyata: ujung kertas bisa ditarik/dilepas mouse atau jari. Ukuran dinamis mengikuti foto asli tanpa blok putih.',
                  badge: 'DEFAULT UTAMA'
                },
                {
                  key: 'fade',
                  icon: '✨',
                  title: 'Fine-Art Soft Crossfade',
                  desc: 'Peralihan larut lembut tanpa hentakan ala eksibisi pameran seni museum modern.',
                  badge: 'Minimalis Seni'
                },
                {
                  key: 'slide_horizontal',
                  icon: '↔️',
                  title: 'Editorial Horizontal Push',
                  desc: 'Geser horizontal presisi tinggi dengan akselerasi kurva kelembutan Apple.',
                  badge: 'Editorial Modern'
                },
                {
                  key: 'zoom_kenburns',
                  icon: '🎥',
                  title: 'Cinematic Ken Burns Drift',
                  desc: 'Skala zoom perlahan melayang sinematik dengan crossfade puitis ala film dokumenter.',
                  badge: 'Sinematik Film'
                },
                {
                  key: 'cube_3d',
                  icon: '🧊',
                  title: '3D Rotating Dimensional Cube',
                  desc: 'Rotasi perspektif kubus 3D geometris dengan kedalaman bayangan ruang nyata.',
                  badge: 'Futuristik 3D'
                },
                {
                  key: 'curtain_wipe',
                  icon: '📷',
                  title: 'Camera Shutter Blade Wipe',
                  desc: 'Efek bilah rana kamera mekanik yang membuka dan menyapu dari poros tengah.',
                  badge: 'Rana Kamera'
                },
                {
                  key: 'film_reel',
                  icon: '🎞️',
                  title: 'Vintage 35mm Analog Reel',
                  desc: 'Gulungan film klise analog vertikal dengan aksen lubang perforasi seluloid klasik.',
                  badge: 'Retro Analog'
                }
              ].map((animOption) => {
                const isSelected = (theme.slideshowTransition || 'flipbook') === animOption.key;
                return (
                  <div
                    key={animOption.key}
                    onClick={() => setTheme(prev => ({ ...prev, slideshowTransition: animOption.key as any }))}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                      background: isSelected ? 'rgba(194, 120, 3, 0.05)' : '#FFFFFF',
                      boxShadow: isSelected ? '0 10px 24px rgba(194, 120, 3, 0.16)' : '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{animOption.icon}</span>
                          <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1D1D1F' }}>
                            {animOption.title}
                          </span>
                        </div>
                        {animOption.badge && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: '6px',
                            background: animOption.key === 'flipbook' ? '#F59E0B' : 'rgba(0,0,0,0.06)',
                            color: animOption.key === 'flipbook' ? '#000000' : '#64748B'
                          }}>
                            {animOption.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, lineHeight: 1.45 }}>
                        {animOption.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: '11px', color: isSelected ? '#C27803' : '#94A3B8', fontWeight: 600 }}>
                        {isSelected ? '✓ Terpilih sebagai default' : 'Klik untuk memilih'}
                      </span>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '6px solid #C27803' : '2px solid #CBD5E1',
                        transition: 'all 0.15s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SUASANA & LATAR BELAKANG */}
      {activeSubTab === 'atmosphere' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Preset Palettes */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                PALET WARNA TERKURASI
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Preset Tema Latar Belakang
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {[
                { key: 'alabaster', name: 'Alabaster Clean', bg: '#FBFBFA', text: '#1D1D1F', desc: 'Putih gading minimalis khas Apple / SudutBingkai.' },
                { key: 'champagne', name: 'Warm Champagne', bg: '#F7EFE5', text: '#2A231C', desc: 'Krem hangat mewah, sangat ideal untuk wedding estetik.' },
                { key: 'obsidian', name: 'Obsidian Darkroom', bg: '#121214', text: '#F5F5F7', desc: 'Hitam pekat sinematik kontras tinggi ala Leica.' },
                { key: 'slate', name: 'Earthy Slate', bg: '#F1F3F5', text: '#1A202C', desc: 'Abu-abu sejuk minimalis kontemporer.' },
                { key: 'terracotta', name: 'Tuscan Terracotta', bg: '#FAF5F0', text: '#2D1E18', desc: 'Nuansa hangat earth-tone merah bata lembut senja Italia.' },
                { key: 'midnight_navy', name: 'Midnight Sapphire', bg: '#0A0E1A', text: '#F0F4FF', desc: 'Biru navy gelap sinematik malam berbintang yang prestisius.' },
                { key: 'emerald_forest', name: 'Vintage Olive Garden', bg: '#F3F6F3', text: '#132219', desc: 'Hijau zaitun lembut menenangkan untuk fotografer outdoor.' },
                { key: 'rose_quartz', name: 'Romantic Rose Petal', bg: '#FDF7F8', text: '#2C1D21', desc: 'Blush pink romantis lembut pengantin dengan kehangatan feminin.' },
                { key: 'espresso_bronze', name: 'Warm Mocha Bronze', bg: '#F9F6F0', text: '#261C16', desc: 'Nuansa cokelat hangat studio kopi & kayu jati mewah.' },
                { key: 'frosted_pearl', name: 'Frosted Pearl Silver', bg: '#F8F9FA', text: '#1A212D', desc: 'Perak mutiara abu-abu es minimalis murni modern.' }
              ].map((p) => {
                const isSelected = theme.backgroundMode === 'preset' && (theme.bgPreset || 'alabaster') === p.key;
                return (
                  <div
                    key={p.key}
                    onClick={() => setTheme(prev => ({ ...prev, backgroundMode: 'preset', bgPreset: p.key as any }))}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                      background: p.bg,
                      color: p.text,
                      boxShadow: isSelected ? '0 8px 24px rgba(194, 120, 3, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800 }}>{p.name}</span>
                      {isSelected && <CheckCircle2 size={16} color="#C27803" />}
                    </div>
                    <p style={{ fontSize: '11.5px', margin: 0, opacity: 0.8, lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Wallpaper Upload with Blur & Dimmer */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                WALLPAPER STUDIO ANDA SENDIRI
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Latar Belakang Gambar Kustom
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                Gunakan foto dokumentasi terbaik atau foto studio Anda sebagai latar belakang landing page dengan efek blur elegan.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                ref={bgImageInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handleBgImageFileUpload}
              />
              <button
                type="button"
                onClick={() => bgImageInputRef.current?.click()}
                className="btn-apple-black"
                style={{ padding: '10px 18px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Upload size={14} />
                <span>Unggah Foto Wallpaper (Max 8MB)</span>
              </button>

              {theme.bgImageUrl && (
                <button
                  type="button"
                  onClick={() => setTheme(prev => ({ ...prev, bgImageUrl: undefined, backgroundMode: 'preset' }))}
                  className="glass-pill"
                  style={{ padding: '10px 16px', fontSize: '12.5px', cursor: 'pointer', color: '#EF4444' }}
                >
                  Hapus Wallpaper
                </button>
              )}
            </div>

            {theme.bgImageUrl && (
              <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                      Tingkat Blur: {theme.bgBlur || 0}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={theme.bgBlur || 0}
                      onChange={e => setTheme(prev => ({ ...prev, bgBlur: Number(e.target.value) }))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                      Overlay Gelap / Dimmer: {theme.bgDimmer || 40}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={theme.bgDimmer || 40}
                      onChange={e => setTheme(prev => ({ ...prev, bgDimmer: Number(e.target.value) }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: IDENTITAS & TAMPILAN HERO */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Hero Style Selector */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                STRUKTUR BAGIAN ATAS
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                Gaya Header & Profil (Hero Style)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              {[
                { key: 'social', title: 'Social Banner (Default)', desc: 'Banner lanskap di atas dengan floating logo profil dan nomor WhatsApp.' },
                { key: 'cinematic_fullscreen', title: 'Fullscreen Cinematic Hero', desc: 'Foto cover memenuhi 100vh layar penuh dengan nama vendor di tengah.' },
                { key: 'split', title: 'Split Editorial Studio', desc: 'Layar terbagi 2: 50% foto vertikal di kiri, 50% profil biodata di kanan.' },
                { key: 'minimalist', title: 'Minimalist Bio-Link', desc: 'Langsung fokus pada logo melingkar di tengah, tanpa banner besar.' },
                { key: 'floating_island', title: 'Floating Glass Island', desc: 'Banner panorama luas dengan kartu profil melayang dalam kapsul frosted glass.' },
                { key: 'story_headline', title: 'Big Editorial Headline', desc: 'Tipografi nama vendor raksasa ala sampul majalah Vogue/Kinfolk.' },
                { key: 'side_dock', title: 'Asymmetric Side Dock', desc: 'Panel identitas vertikal ramping di sisi kiri dengan galeri karya di kanan.' },
                { key: 'polaroid_stacked', title: 'Stacked Frames Showcase', desc: 'Header interaktif dengan 3 frame preview foto artistik bertumpuk di samping profil.' }
              ].map((heroOption) => {
                const isSelected = (theme.heroStyle || 'social') === heroOption.key;
                const isFlipped = flippedHeroCard === heroOption.key;
                return (
                  <div
                    key={heroOption.key}
                    onClick={() => {
                      setTheme(prev => ({ ...prev, heroStyle: heroOption.key as any }));
                      setFlippedHeroCard(prev => prev === heroOption.key ? null : heroOption.key);
                    }}
                    style={{
                      perspective: '1000px',
                      minHeight: '170px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minHeight: '170px',
                      borderRadius: '16px',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}>
                      {/* FRONT FACE (Info & Title) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                        background: isSelected ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                        boxShadow: isSelected ? '0 8px 24px rgba(194, 120, 3, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: isSelected ? '#C27803' : '#86868B', fontWeight: 700 }}>
                              {isSelected ? '✓ Terpilih' : 'Gaya Header'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#86868B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Denah</span>
                              <RotateCw size={11} />
                            </span>
                          </div>
                          <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                            {heroOption.title}
                          </h4>
                          <p style={{ fontSize: '11.5px', color: '#6E6E73', margin: 0, lineHeight: 1.4 }}>
                            {heroOption.desc}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '11px', color: '#86868B' }}>
                          <span style={{ color: '#C27803', fontWeight: 600 }}>Klik untuk putar & lihat denah</span>
                          <RotateCw size={12} color="#C27803" />
                        </div>
                      </div>

                      {/* BACK FACE (Architectural Wireframe Denah) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: isSelected ? '2px solid #C27803' : '1px solid #1D1D1F',
                        background: '#121214',
                        color: '#FFFFFF',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700, letterSpacing: '0.08em' }}>
                              DENAH HEADER HERO
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <RotateCw size={10} />
                              <span>Putar Balik</span>
                            </span>
                          </div>

                          {/* Wireframe Diagram */}
                          <div style={{ padding: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {renderHeroStyleWireframe(heroOption.key, isSelected)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {heroOption.title}
                          </span>
                          <span style={{ fontSize: '9.5px', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {isSelected ? '✓ Aktif' : 'Pilih'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner & Information Form */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '20px' }}>
              Identitas Profil & Kontak
            </h3>

            {/* Banner Cover Upload */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                Banner Sampul Profil (Cover Header)
              </label>
              
              <div
                onClick={() => coverFileInputRef.current?.click()}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '180px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px dashed rgba(0,0,0,0.15)',
                  background: coverUrl ? '#000000' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#86868B' }}>
                    <Upload size={28} style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Klik untuk upload banner sampul (16:6 rasio lanskap)</span>
                  </div>
                )}
              </div>
              <input ref={coverFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverFileUpload} />
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Alamat URL Portofolio (Slug) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.15)', padding: '0 12px' }}>
                  <span style={{ fontSize: '13px', color: '#86868B', fontFamily: 'var(--font-mono)' }}>sudutbingkai.id/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    placeholder="nama-studio"
                    style={{ border: 'none', outline: 'none', padding: '12px 6px', fontSize: '13px', fontWeight: 600, flex: 1, color: '#1D1D1F' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Nomor WhatsApp Reservasi *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.15)', padding: '0 12px' }}>
                  <MessageCircle size={15} color="#10B981" />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="08123456789"
                    style={{ border: 'none', outline: 'none', padding: '12px 8px', fontSize: '13px', flex: 1, color: '#1D1D1F' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="@studio.official"
                  className="glass-input"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Website Eksternal (Opsional)
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://vendoranda.com"
                  className="glass-input"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                Bio Singkat & Gaya Fotografi
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Contoh: Mengabadikan kehangatan cinta melalui sentuhan warna film natural dan emosi autentik."
                className="glass-input"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            {/* Typography & Accent Color */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {/* Visual Typography Font Picker */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Gaya Font Brand (Pilih & Lihat Bentuk Asli Font)
                </label>

                {(() => {
                  const currentFontKey = theme.fontStyle || 'sans';
                  const currentFontObj = FONT_OPTIONS.find(f => f.key === currentFontKey) || FONT_OPTIONS[0];
                  return (
                    <>
                      {/* Active Font Trigger Card */}
                      <button
                        type="button"
                        onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                        className="glass-card"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#FFFFFF',
                          border: isFontPickerOpen ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.12)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#C27803', background: 'rgba(194, 120, 3, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                              {currentFontObj.category}
                            </span>
                            <strong style={{ fontSize: '13px', color: '#1D1D1F' }}>
                              {currentFontObj.name}
                            </strong>
                          </div>
                          <div style={{ fontFamily: currentFontObj.fontFamily, fontSize: '15px', color: '#4B5563', fontStyle: currentFontObj.key === 'playfair' ? 'italic' : 'normal' }}>
                            {currentFontObj.sample}
                          </div>
                        </div>

                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isFontPickerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </button>

                      {/* Dropdown Options List with Live Preview */}
                      {isFontPickerOpen && (
                        <div className="glass-card" style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '8px',
                          zIndex: 70,
                          padding: '8px',
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(0,0,0,0.12)',
                          boxShadow: '0 20px 48px rgba(0,0,0,0.16)',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          {FONT_OPTIONS.map((f) => {
                            const isFontSelected = (theme.fontStyle || 'sans') === f.key;
                            return (
                              <div
                                key={f.key}
                                onClick={() => {
                                  setTheme(prev => ({ ...prev, fontStyle: f.key as any }));
                                  setIsFontPickerOpen(false);
                                  toast.success(`Font diubah ke: ${f.name}`);
                                }}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  background: isFontSelected ? 'rgba(194, 120, 3, 0.08)' : 'transparent',
                                  border: isFontSelected ? '1px solid #C27803' : '1px solid transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: isFontSelected ? '#C27803' : '#86868B', letterSpacing: '0.04em' }}>
                                      {f.category}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F' }}>
                                      {f.name}
                                    </span>
                                  </div>
                                  <div style={{ fontFamily: f.fontFamily, fontSize: '15px', color: isFontSelected ? '#8C5400' : '#374151', fontStyle: f.key === 'playfair' ? 'italic' : 'normal' }}>
                                    {f.sample}
                                  </div>
                                </div>

                                {isFontSelected && <CheckCircle2 size={16} color="#C27803" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Warna Aksen Brand
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={theme.accentColor || '#C27803'}
                    onChange={e => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                    style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={theme.accentColor || '#C27803'}
                    onChange={e => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="glass-input"
                    style={{ width: '120px', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: FITUR TAMBAHAN & KEAMANAN */}
      {activeSubTab === 'features' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Security & Protection Toggles */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>
              Proteksi Foto & Konversi Klien
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>Watermark Logo Otomatis</strong>
                  <span style={{ fontSize: '11.5px', color: '#86868B' }}>Tampilkan logo studio di sudut foto saat slideshow dibuka.</span>
                </div>
                <input
                  type="checkbox"
                  checked={theme.watermarkEnabled || false}
                  onChange={e => setTheme(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>Proteksi Klik Kanan</strong>
                  <span style={{ fontSize: '11.5px', color: '#86868B' }}>Mencegah klik kanan simpan gambar oleh pengunjung.</span>
                </div>
                <input
                  type="checkbox"
                  checked={theme.disableRightClick || false}
                  onChange={e => setTheme(prev => ({ ...prev, disableRightClick: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>Sticky WhatsApp Bar (Mobile)</strong>
                  <span style={{ fontSize: '11.5px', color: '#86868B' }}>Bar mengambang di bawah layar HP agar mudah dihubungi.</span>
                </div>
                <input
                  type="checkbox"
                  checked={theme.enableStickyMobileBar !== false}
                  onChange={e => setTheme(prev => ({ ...prev, enableStickyMobileBar: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>Formulir Cek Jadwal</strong>
                  <span style={{ fontSize: '11.5px', color: '#86868B' }}>Aktifkan tombol popup cek ketersediaan tanggal.</span>
                </div>
                <input
                  type="checkbox"
                  checked={theme.enableLeadForm !== false}
                  onChange={e => setTheme(prev => ({ ...prev, enableLeadForm: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>


          {/* Video Highlight Teaser */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  🎥 Video Highlight / Cinematic Teaser
                </h3>
                <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                  Sematkan video teaser pernikahan layar lebar di landing page. Klien dapat menggeser (swipe horizontal) jika ada lebih dari 1 video.
                </p>
              </div>
              <input
                type="checkbox"
                checked={theme.showVideoHighlight || false}
                onChange={e => setTheme(prev => ({ ...prev, showVideoHighlight: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {theme.showVideoHighlight && (
              <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 3D Flip Card Layout Options */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        TATA LETAK SINEMATIK
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1D1D1F', margin: '4px 0 0 0' }}>
                        Pilihan Gaya Layout Video Highlight
                      </h4>
                      <p style={{ fontSize: '12px', color: '#6E6E73', margin: '2px 0 0 0' }}>
                        Klik kartu untuk memilih tata letak dan memutar kartu (3D Flip) untuk melihat denah strukturnya.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
                    {[
                      { 
                        key: 'carousel_slider', 
                        title: 'Horizontal Swipe Stage', 
                        desc: 'Panggung carousel layar lebar dengan swipe horizontal, tab judul film, dan tombol panah navigasi (Default).' 
                      },
                      { 
                        key: 'cinema_imax', 
                        title: 'Full-Width IMAX Theater', 
                        desc: 'Tampilan sinema membentang penuh (edge-to-edge) dengan backdrop blur dramatis dan aura bioskop mewah.' 
                      },
                      { 
                        key: 'side_split', 
                        title: 'Editorial Split Story', 
                        desc: 'Layout 2 kolom: kiri untuk sinopsis & daftar playlist film, kanan untuk pemutar video utama.' 
                      },
                      { 
                        key: 'bento_grid', 
                        title: 'Bento Video Mosaic', 
                        desc: 'Semua video highlight langsung tertata rapi dalam kisi grid berdampingan tanpa perlu digeser.' 
                      }
                    ].map((opt) => {
                      const isSelected = (theme.videoHighlightLayout || 'carousel_slider') === opt.key;
                      const isFlipped = flippedVideoCard === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => {
                            setTheme(prev => ({ ...prev, videoHighlightLayout: opt.key as any }));
                            setFlippedVideoCard(prev => prev === opt.key ? null : opt.key);
                          }}
                          style={{
                            perspective: '1000px',
                            minHeight: '170px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            minHeight: '170px',
                            borderRadius: '16px',
                            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}>
                            {/* FRONT FACE */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              borderRadius: '16px',
                              padding: '16px 18px',
                              border: isSelected ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                              background: isSelected ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                              boxShadow: isSelected ? '0 8px 24px rgba(194, 120, 3, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', color: isSelected ? '#C27803' : '#86868B', fontWeight: 700 }}>
                                    {isSelected ? '✓ Terpilih' : 'Layout Video'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#86868B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span>Denah</span>
                                    <RotateCw size={11} />
                                  </span>
                                </div>
                                <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: '0 0 4px', color: '#1D1D1F' }}>
                                  {opt.title}
                                </h4>
                                <p style={{ fontSize: '11.5px', color: '#6E6E73', margin: 0, lineHeight: 1.4 }}>
                                  {opt.desc}
                                </p>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '11px', color: '#86868B' }}>
                                <span style={{ color: '#C27803', fontWeight: 600 }}>Klik untuk putar & lihat denah</span>
                                <RotateCw size={12} color="#C27803" />
                              </div>
                            </div>

                            {/* BACK FACE (Architectural Wireframe Denah) */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)',
                              borderRadius: '16px',
                              padding: '14px 16px',
                              border: isSelected ? '2px solid #C27803' : '1px solid #1D1D1F',
                              background: '#121214',
                              color: '#FFFFFF',
                              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700, letterSpacing: '0.08em' }}>
                                    DENAH STRUKTUR
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <RotateCw size={10} />
                                    <span>Putar Balik</span>
                                  </span>
                                </div>

                                {/* Wireframe Diagram */}
                                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  {renderVideoHighlightWireframe(opt.key, isSelected)}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {opt.title}
                                </span>
                                <span style={{ fontSize: '9.5px', color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  {isSelected ? '✓ Aktif' : 'Pilih'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                {currentVideoList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', borderRadius: '16px', background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: '13px', color: '#6E6E73', margin: '0 0 12px 0' }}>Belum ada video highlight yang ditambahkan.</p>
                    <button type="button" onClick={handleAddVideo} className="btn-apple-black" style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>
                      + Tambah Video Pertama
                    </button>
                  </div>
                ) : (
                  currentVideoList.map((vid, idx) => (
                    <div 
                      key={vid.id || idx} 
                      style={{ 
                        padding: '18px', 
                        borderRadius: '16px', 
                        background: 'rgba(0,0,0,0.02)', 
                        border: '1px solid rgba(0,0,0,0.07)',
                        position: 'relative' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, background: '#1D1D1F', color: '#FFF', padding: '3px 8px', borderRadius: '6px' }}>
                            Video #{idx + 1}
                          </span>
                          {vid.title && (
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                              {vid.title}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(vid.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                            Link Video (YouTube / Vimeo / Drive) *
                          </label>
                          <input
                            type="text"
                            value={vid.url || ''}
                            onChange={e => handleUpdateVideo(vid.id, 'url', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="glass-input"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                            Judul Video
                          </label>
                          <input
                            type="text"
                            value={vid.title || ''}
                            onChange={e => handleUpdateVideo(vid.id, 'title', e.target.value)}
                            placeholder="Contoh: The Wedding of Rian & Nisa"
                            className="glass-input"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                            Kategori / Tag Subtitle (Opsional)
                          </label>
                          <input
                            type="text"
                            value={vid.category || ''}
                            onChange={e => handleUpdateVideo(vid.id, 'category', e.target.value)}
                            placeholder="Contoh: Cinematic Teaser / Prewedding"
                            className="glass-input"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    className="btn-apple-black"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      fontSize: '12.5px',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Tambah Video Highlight Lainnya</span>
                  </button>

                  {currentVideoList.length > 1 && (
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>
                      Total {currentVideoList.length} video (bisa digeser oleh klien)
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(194, 120, 3, 0.07)', border: '1px solid rgba(194, 120, 3, 0.2)', fontSize: '12px', color: '#8F5700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={14} style={{ flexShrink: 0 }} />
                  <span><strong>Fitur Geser / Slider Otomatis:</strong> Di website portofolio Anda, video akan ditampilkan dalam bentuk carousel geser (horizontal swipe) lengkap dengan tombol navigasi panah dan tab judul video.</span>
                </div>
              </div>
            )}
          </div>

          {/* Testimoni Klien Editor */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  ⭐ Ulasan & Testimoni Klien
                </h3>
                <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                  Tampilkan kepuasan pasangan pengantin sebelumnya di landing page Anda.
                </p>
              </div>
              <input
                type="checkbox"
                checked={theme.showTestimonials || false}
                onChange={e => setTheme(prev => ({ ...prev, showTestimonials: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {theme.showTestimonials && (
              <div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Nama Klien (misal: Sarah & Dimas)"
                    value={newTestiClient}
                    onChange={e => setNewTestiClient(e.target.value)}
                    className="glass-input"
                    style={{ flex: 1, minWidth: '180px', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                  />
                  <input
                    type="text"
                    placeholder="Tanggal (misal: Wedding 2026)"
                    value={newTestiDate}
                    onChange={e => setNewTestiDate(e.target.value)}
                    className="glass-input"
                    style={{ width: '160px', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                  />
                  <input
                    type="text"
                    placeholder="Kutipan Ulasan Klien..."
                    value={newTestiQuote}
                    onChange={e => setNewTestiQuote(e.target.value)}
                    className="glass-input"
                    style={{ flex: 2, minWidth: '220px', padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                  />
                  <button type="button" onClick={handleAddTestimonial} className="btn-apple-black" style={{ padding: '9px 16px', fontSize: '12.5px', cursor: 'pointer' }}>
                    + Tambah Testimoni
                  </button>
                </div>

                {theme.testimonials && theme.testimonials.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {theme.testimonials.map((t) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div>
                          <strong style={{ fontSize: '13px' }}>{t.clientName}</strong>
                          <span style={{ fontSize: '12px', color: '#86868B', marginLeft: '8px' }}>"{t.quote}"</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveTestimonial(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mini FAQ Editor */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                  ❓ Mini FAQ (Tanya Jawab Klien)
                </h3>
                <p style={{ fontSize: '13px', color: '#6E6E73', margin: '4px 0 0 0' }}>
                  Jawab pertanyaan umum seputar DP, durasi revisi, dan pengiriman album fisik.
                </p>
              </div>
              <input
                type="checkbox"
                checked={theme.showFaq || false}
                onChange={e => setTheme(prev => ({ ...prev, showFaq: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {theme.showFaq && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Pertanyaan (misal: Berapa lama waktu pengeditan foto?)"
                    value={newFaqQuestion}
                    onChange={e => setNewFaqQuestion(e.target.value)}
                    className="glass-input"
                    style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                  />
                  <input
                    type="text"
                    placeholder="Jawaban (misal: Sneak peek 3 hari, file edit lengkap selesai dalam 14 hari kerja.)"
                    value={newFaqAnswer}
                    onChange={e => setNewFaqAnswer(e.target.value)}
                    className="glass-input"
                    style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px' }}
                  />
                  <div>
                    <button type="button" onClick={handleAddFaq} className="btn-apple-black" style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>
                      + Tambah FAQ
                    </button>
                  </div>
                </div>

                {theme.faqs && theme.faqs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {theme.faqs.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div>
                          <strong style={{ fontSize: '12.5px', display: 'block' }}>Q: {f.question}</strong>
                          <span style={{ fontSize: '11.5px', color: '#86868B' }}>A: {f.answer}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveFaq(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL TAMBAH / EDIT KATEGORI ALBUM */}
      {albumModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: '24px',
            backgroundColor: '#FFFFFF',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
              {editingAlbumId ? 'Edit Kategori Album' : 'Tambah Kategori Album Baru'}
            </h3>
            <p style={{ fontSize: '13px', color: '#6E6E73', margin: '0 0 20px 0' }}>
              Masukkan judul kategori dan tempel link folder Google Drive foto Anda.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Nama Kategori / Album *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Wedding Adat Jawa, Prewedding Bali, Lamaran"
                  value={albumTitle}
                  onChange={e => setAlbumTitle(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Deskripsi Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rian & Nisa • Hotel Santika Premiere"
                  value={albumDesc}
                  onChange={e => setAlbumDesc(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Link Folder Google Drive *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={albumDriveUrl}
                    onChange={e => {
                      setAlbumDriveUrl(e.target.value);
                      if (driveCheckError) setDriveCheckError(null);
                    }}
                    className="glass-input"
                    style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={handleCheckDriveFolder}
                    disabled={isCheckingDrive}
                    className="glass-pill"
                    style={{
                      padding: '0 16px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: isCheckingDrive ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isCheckingDrive ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    <span>{isCheckingDrive ? 'Cek...' : 'Cek Foto'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginTop: '4px' }}>
                  Pastikan akses folder Google Drive diset ke <strong>"Siapa saja yang memiliki link"</strong>.
                </span>
              </div>

              {driveCheckError && (
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#DC2626', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{driveCheckError}</span>
                </div>
              )}

              {drivePhotos.length > 0 && (
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                    Pilih Sampul dari Google Drive ({drivePhotos.length} sampel foto terbaca)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {drivePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => {
                          setAlbumCoverUrl(photo.url);
                          setCoverSource('drive');
                        }}
                        style={{
                          height: '70px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: albumCoverUrl === photo.url ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                          position: 'relative'
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="Sampel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {albumCoverUrl === photo.url && (
                          <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#C27803', borderRadius: '50%', color: '#FFFFFF', padding: '2px' }}>
                            <Check size={10} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Foto Sampul Album (Cover)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="URL gambar sampul atau pilih sampel di atas"
                    value={albumCoverUrl}
                    onChange={e => setAlbumCoverUrl(e.target.value)}
                    className="glass-input"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px' }}
                  />
                  <input
                    ref={albumCoverInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAlbumCoverFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => albumCoverInputRef.current?.click()}
                    className="glass-pill"
                    style={{ padding: '0 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
                  >
                    <Upload size={13} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button
                type="button"
                onClick={() => setAlbumModalOpen(false)}
                className="glass-pill"
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', border: 'none', color: '#1D1D1F' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveAlbum}
                disabled={isSavingAlbum}
                className="btn-apple-black"
                style={{
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSavingAlbum ? 'wait' : 'pointer',
                  opacity: isSavingAlbum ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSavingAlbum && <Loader2 size={14} className="animate-spin" />}
                <span>{editingAlbumId ? 'Simpan Perubahan' : 'Tambahkan ke Portofolio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
