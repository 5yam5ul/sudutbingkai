'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, ArrowRight, Check, Calendar, MapPin, Film, 
  Lock, Unlock, Sparkles, Clock, CheckCircle2, ShieldCheck, Heart, Users, SlidersHorizontal, Eye
} from 'lucide-react';
import { FILM_PRESETS } from '@/lib/filters';
import { FilmPresetId, EventPackageTier, PACKAGE_TIERS } from '@/lib/types';
import { FrameId } from '@/lib/frames';
import FrameCustomizer from '@/components/FrameCustomizer';

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageQuery = (searchParams.get('package')?.toLowerCase() || 'wedding') as EventPackageTier;
  const initialTierKey: EventPackageTier = PACKAGE_TIERS[packageQuery] ? packageQuery : 'wedding';

  const [loading, setLoading] = useState(false);

  // Form State
  const [eventType, setEventType] = useState<'wedding' | 'birthday' | 'corporate' | 'other'>('wedding');
  const [title, setTitle] = useState('');
  const [coupleOrHost, setCoupleOrHost] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');

  // 1. Package Tier (Automatically locked from purchase / query param)
  const [selectedTier, setSelectedTier] = useState<EventPackageTier>(initialTierKey);
  const [showPackageUpgradeModal, setShowPackageUpgradeModal] = useState(false);
  const activeTier = PACKAGE_TIERS[selectedTier] || PACKAGE_TIERS.wedding;

  // 2. Film Filter States
  const [primaryPreset, setPrimaryPreset] = useState<FilmPresetId>('portra');
  const [allowedPresets, setAllowedPresets] = useState<FilmPresetId[]>(['portra', 'funsaver', 'quicksnap', 'ilford']);
  const [allowGuestPresetSwitch, setAllowGuestPresetSwitch] = useState<boolean>(true);
  const [previewSample, setPreviewSample] = useState<'couple' | 'guests'>('couple');

  // 3. Reveal Mode & Schedule States
  const [revealMode, setRevealMode] = useState<'instant' | 'delayed'>('instant');
  const [revealTime, setRevealTime] = useState<string>('');

  // 4. Frame & Voice Note State
  const [frameId, setFrameId] = useState<FrameId>('minimal-gold');
  const [customFrameUrl, setCustomFrameUrl] = useState<string>('');
  const [frameText, setFrameText] = useState<string>('');
  const [allowGuestFrameToggle, setAllowGuestFrameToggle] = useState<boolean>(true);
  const [allowVoiceNote, setAllowVoiceNote] = useState<boolean>(true);

  // Toggle filter checkbox
  const togglePresetAllowed = (presetId: FilmPresetId) => {
    if (allowedPresets.includes(presetId)) {
      if (allowedPresets.length <= 1) {
        alert('Minimal harus ada 1 filter yang aktif!');
        return;
      }
      setAllowedPresets(prev => prev.filter(p => p !== presetId));
    } else {
      if (allowedPresets.length >= activeTier.maxPresets) {
        alert(`Batas ${activeTier.name} maksimal ${activeTier.maxPresets} filter analog. Silakan upgrade paket jika ingin menambah filter.`);
        return;
      }
      setAllowedPresets(prev => [...prev, presetId]);
    }
  };

  // Quick chips for reveal time
  const handleQuickRevealTime = (type: 'tonight' | 'midnight' | 'tomorrow_morning' | 'tomorrow_noon' | 'after_24h') => {
    const baseDate = eventDate ? new Date(eventDate) : new Date();
    const target = new Date(baseDate);

    if (type === 'tonight') {
      target.setHours(22, 0, 0, 0);
    } else if (type === 'midnight') {
      target.setHours(23, 59, 0, 0);
    } else if (type === 'tomorrow_morning') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow_noon') {
      target.setDate(target.getDate() + 1);
      target.setHours(12, 0, 0, 0);
    } else if (type === 'after_24h') {
      target.setDate(target.getDate() + 1);
    }

    setRevealTime(target.toISOString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          coupleOrHost,
          eventDate: eventDate || new Date().toISOString(),
          location,
          preset: primaryPreset,
          allowedPresets,
          allowGuestPresetSwitch,
          packageTier: selectedTier,
          maxGuests: activeTier.maxGuests,
          shotsPerGuest: activeTier.shotsPerGuest,
          revealMode,
          revealTime: revealMode === 'delayed' ? revealTime : undefined,
          frameId,
          customFrameUrl: customFrameUrl || undefined,
          frameText,
          allowGuestFrameToggle,
          allowVoiceNote,
        }),
      });

      const data = await res.json();
      if (data.success && data.event) {
        router.push(`/event/${data.event.id}`);
      } else {
        alert('Gagal membuat acara: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err: unknown) {
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', position: 'relative' }}>
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

      {/* Top Glass Navigation */}
      <header className="glass-nav" style={{
        position: 'relative',
        zIndex: 50,
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#515154', width: '70px' }}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '13.5px', fontWeight: 500 }}>Kembali</span>
          </Link>

          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#1D1D1F' }}>
            Buat Album Acara
          </span>

          <div style={{ width: '70px', visibility: 'hidden' }} aria-hidden="true" />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ position: 'relative', zIndex: 10, padding: '28px 16px 80px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
            SETUP ALBUM DIGITAL
          </span>
          <h1 className="font-display-serif" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px', color: '#1D1D1F' }}>
            Siapkan Wadah <em>Kenangan Acaramu</em>
          </h1>
          <p style={{ color: '#6E6E73', fontSize: '14px', maxWidth: '520px', margin: '0 auto' }}>
            Atur nama acara, konfirmasi kuota paket yang sudah dibeli, pilih karakter warna film analog, dan dapatkan kartu barcode meja seketika.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: INFORMASI ACARA & STATUS PAKET PEMBELIAN TERVERIFIKASI */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                01 • DETAIL ACARA & PAKET AKTIF
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Otomatis terkunci sesuai paket
              </span>
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '20px', color: '#1D1D1F' }}>
              Informasi Acara
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Kategori Perayaan */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                  Kategori Perayaan
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(['wedding', 'birthday', 'corporate', 'other'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEventType(cat)}
                      className="glass-pill"
                      style={{
                        padding: '7px 14px',
                        fontSize: '12.5px',
                        fontWeight: eventType === cat ? 700 : 500,
                        background: eventType === cat ? (cat === 'wedding' ? '#C27803' : '#1D1D1F') : 'rgba(255, 255, 255, 0.7)',
                        color: eventType === cat ? '#FFFFFF' : '#1D1D1F',
                        cursor: 'pointer'
                      }}
                    >
                      {cat === 'wedding' && 'Pernikahan & Resepsi (Favorit)'}
                      {cat === 'birthday' && 'Ulang Tahun & Sweet 17'}
                      {cat === 'corporate' && 'Gathering Kantor & Gala'}
                      {cat === 'other' && 'Reuni, Konser & Festival'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Acara */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                  Nama Acara *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    eventType === 'wedding'
                      ? 'Contoh: Hari Pernikahan Dimas & Sarah'
                      : 'Contoh: Sweet 17 Keisha Azzahra'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Penyelenggara / Tuan Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas & Sarah"
                    value={coupleOrHost}
                    onChange={(e) => setCoupleOrHost(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                    Tanggal Acara
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                  Lokasi / Venue Acara
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Plataran Hutan Kota, Senayan, Jakarta"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14.5px' }}
                />
              </div>

              {/* STATUS PAKET PEMBELIAN AKTIF (OTOMATIS TERVERIFIKASI TANPA PILIH MANUAL) */}
              <div style={{
                marginTop: '12px',
                padding: '20px 22px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(194, 120, 3, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%)',
                border: '1.5px solid rgba(194, 120, 3, 0.35)',
                boxShadow: '0 8px 24px -4px rgba(194, 120, 3, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#C27803',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(194, 120, 3, 0.3)'
                    }}>
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span className="font-mono-film" style={{ fontSize: '10.5px', color: '#C27803' }}>
                          PAKET PEMBELIAN ANDA
                        </span>
                        <span style={{ fontSize: '10px', background: '#27AE60', color: '#FFFFFF', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                          ✓ AKTIF & TERVERIFIKASI
                        </span>
                      </div>
                      <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#1D1D1F', margin: 0 }}>
                        Paket {activeTier.name} ({activeTier.guestsLabel})
                      </h3>
                    </div>
                  </div>

                  {/* Switch/Upgrade button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPackageUpgradeModal(!showPackageUpgradeModal)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(194, 120, 3, 0.3)',
                        color: '#C27803',
                        padding: '7px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>Ganti / Beralih Paket</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Active Quotas Locked Display */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>KAPASITAS TAMU</span>
                    <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>{activeTier.guestsLabel}</strong>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>JATAH FOTO</span>
                    <strong style={{ fontSize: '15px', color: '#C27803' }}>{activeTier.shotsPerGuest} Jepretan / Tamu</strong>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '2px' }}>KUOTA FILTER FILM</span>
                    <strong style={{ fontSize: '15px', color: '#1D1D1F' }}>Maks {activeTier.maxPresets} Filter</strong>
                  </div>
                </div>

                {/* Quick Switch Dropdown */}
                {showPackageUpgradeModal && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(194, 120, 3, 0.2)' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: '8px' }}>
                      Pilih paket yang sudah Anda beli di website:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      {Object.values(PACKAGE_TIERS).map((tier) => {
                        const isCurrent = selectedTier === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => {
                              setSelectedTier(tier.id);
                              if (allowedPresets.length > tier.maxPresets) {
                                setAllowedPresets(allowedPresets.slice(0, tier.maxPresets));
                              }
                              setShowPackageUpgradeModal(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: isCurrent ? '#C27803' : '#FFFFFF',
                              color: isCurrent ? '#FFFFFF' : '#1D1D1F',
                              border: isCurrent ? '1.5px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '12px' }}>{tier.name}</strong>
                              {isCurrent && <Check size={12} />}
                            </div>
                            <span style={{ fontSize: '10px', opacity: 0.85, display: 'block' }}>{tier.guestsLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <span style={{ fontSize: '11px', color: '#6E6E73', display: 'block', marginTop: '10px', fontStyle: 'italic' }}>
                  * Jatah foto dan kapasitas tamu di atas telah otomatis terkunci sesuai paket yang Anda beli.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: KARAKTER WARNA FILM ANALOG (PREVIEW FOTO NYATA) */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                02 • KARAKTER WARNA FILM ANALOG (PREVIEW NYATA)
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Filter aktif ({allowedPresets.length}/{activeTier.maxPresets})
              </span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: '#1D1D1F' }}>
              Pilih Emulasi Film Analog & Izin Tamu
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginBottom: '20px' }}>
              Lihat pratinjau visual di bawah. Tentukan <strong>Filter Utama</strong> sebagai signature tone acara Anda, dan centang filter tambahan yang bisa dipilih tamu di kamera mereka.
            </p>

            {/* Model Sample Switcher */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} color="#C27803" />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F' }}>
                  Lihat Preview Tone Pada Model Foto:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewSample('couple')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: previewSample === 'couple' ? 700 : 500,
                    background: previewSample === 'couple' ? '#C27803' : '#FFFFFF',
                    color: previewSample === 'couple' ? '#FFFFFF' : '#1D1D1F',
                    border: previewSample === 'couple' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    boxShadow: previewSample === 'couple' ? '0 2px 8px rgba(194, 120, 3, 0.3)' : 'none'
                  }}
                >
                  💍 Foto Pengantin
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSample('guests')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: previewSample === 'guests' ? 700 : 500,
                    background: previewSample === 'guests' ? '#C27803' : '#FFFFFF',
                    color: previewSample === 'guests' ? '#FFFFFF' : '#1D1D1F',
                    border: previewSample === 'guests' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    boxShadow: previewSample === 'guests' ? '0 2px 8px rgba(194, 120, 3, 0.3)' : 'none'
                  }}
                >
                  📸 Selfie Tamu Meja
                </button>
              </div>
            </div>

            {/* Presets Visual Grid with Photo Previews */}
            <div className="presets-grid-responsive">
              {Object.entries(FILM_PRESETS).map(([id, p]) => {
                const presetId = id as FilmPresetId;
                const isPrimary = primaryPreset === presetId;
                const isAllowed = allowedPresets.includes(presetId);

                return (
                  <div
                    key={id}
                    style={{
                      padding: '12px',
                      borderRadius: '18px',
                      background: isPrimary ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                      border: isPrimary ? '2px solid #C27803' : isAllowed ? '1.5px solid rgba(194, 120, 3, 0.45)' : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isPrimary ? '0 8px 24px -4px rgba(194, 120, 3, 0.2)' : '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div>
                      {/* Visual Photo Preview with Analog Filter Applied */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        marginBottom: '10px',
                        background: '#12110F',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <img
                          src={previewSample === 'couple' ? '/samples/dummy-couple.jpg' : '/samples/dummy-guests.jpg'}
                          alt={p.name}
                          className={`film-${presetId}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />

                        {/* Retro Amber Date Stamp */}
                        <span style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '8px',
                          color: '#ff9900',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9.5px',
                          fontWeight: 'bold',
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                        }}>
                          '26 10 11
                        </span>

                        {/* Primary Signature Pill */}
                        {isPrimary && (
                          <span style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            background: '#C27803',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            letterSpacing: '0.04em'
                          }}>
                            ★ UTAMA
                          </span>
                        )}
                      </div>

                      {/* Header / Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.accentColor, display: 'inline-block' }} />
                          <strong style={{ fontSize: '13.5px', color: '#1D1D1F' }}>
                            {p.name}
                          </strong>
                        </div>
                        <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#86868B', fontWeight: 600 }}>
                          {p.iso}
                        </span>
                      </div>

                      <span style={{ fontSize: '11px', color: '#6E6E73', display: 'block', lineHeight: 1.35, marginBottom: '10px' }}>
                        {p.tagline} • {p.description}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPrimaryPreset(presetId);
                          if (!allowedPresets.includes(presetId)) {
                            togglePresetAllowed(presetId);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          fontWeight: isPrimary ? 700 : 500,
                          borderRadius: '8px',
                          border: 'none',
                          background: isPrimary ? '#C27803' : 'rgba(0,0,0,0.05)',
                          color: isPrimary ? '#FFF' : '#1D1D1F',
                          cursor: 'pointer'
                        }}
                      >
                        {isPrimary ? '✓ Filter Utama Acara' : 'Jadikan Filter Utama'}
                      </button>

                      {allowGuestPresetSwitch && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#515154', cursor: 'pointer', padding: '2px 0' }}>
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => togglePresetAllowed(presetId)}
                            style={{ accentColor: '#C27803', cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <span style={{ fontWeight: isAllowed ? 600 : 400 }}>Aktif di kamera tamu</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toggle: Izinkan Tamu Berganti Filter di Kamera */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 18px',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block', marginBottom: '2px' }}>
                  Izinkan Tamu Mengganti Filter Film di Kamera
                </strong>
                <span style={{ fontSize: '12px', color: '#86868B' }}>
                  Jika aktif, tamu dapat memilih dari {allowedPresets.length} filter aktif di atas saat memotret di ponsel mereka.
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowGuestPresetSwitch}
                onChange={(e) => setAllowGuestPresetSwitch(e.target.checked)}
                style={{ width: '22px', height: '22px', accentColor: '#C27803', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* SECTION 3: DESAIN BINGKAI FOTO (DUMMY NYATA + 10 BINGKAI MEWAH) */}
          <div className="glass-card form-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px' }}>
                03 • DESAIN BINGKAI FOTO MEWAH
              </span>
              <span style={{ fontSize: '11.5px', color: '#86868B' }}>
                Preview Foto Nyata
              </span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: '#1D1D1F' }}>
              Pilih Template Bingkai & Kustomisasi Teks
            </h2>
            <p style={{ color: '#6E6E73', fontSize: '13.5px', marginBottom: '24px' }}>
              Tersedia 10 desain bingkai mewah bertekstur, opsi foto RAW murni, atau unggah PNG transparan buatan Anda sendiri.
            </p>

            <FrameCustomizer
              initialFrameId={frameId}
              initialCustomFrameUrl={customFrameUrl}
              initialCoupleName={coupleOrHost || 'Sarah & Dimas'}
              initialEventDate={eventDate}
              initialTagline="The Beginning of Forever"
              initialAllowGuestToggle={allowGuestFrameToggle}
              onUpdate={({ frameId: fId, customFrameUrl: cUrl, coupleName: cName, eventDate: eDate, tagline: tLine, allowGuestFrameToggle: aToggle }) => {
                setFrameId(fId);
                setCustomFrameUrl(cUrl || '');
                setFrameText(`${cName} • ${eDate} • ${tLine}`);
                setAllowGuestFrameToggle(aToggle);
              }}
            />
          </div>

          {/* SECTION 4: ATURAN KAMERA & WAKTU BUKA ALBUM (CUCI ROLL) */}
          <div className="glass-card form-section-card">
            <span className="font-mono-film" style={{ color: '#C27803', display: 'block', marginBottom: '8px' }}>
              04 • ATURAN KAMERA & PENGUNGKAPAN
            </span>
            <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '20px', color: '#1D1D1F' }}>
              Waktu Buka Album & Pesan Suara Tamu
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Reveal Mode Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '8px' }}>
                  Kapan Foto Diungkapkan (Revealed)?
                </label>
                <div className="responsive-two-col">
                  <div
                    onClick={() => setRevealMode('instant')}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: revealMode === 'instant' ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.8)',
                      border: revealMode === 'instant' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Unlock size={16} color={revealMode === 'instant' ? '#C27803' : '#86868B'} />
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Langsung Terbuka</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.4 }}>
                      Tamu dan pengantin bisa langsung melihat foto sesaat setelah dijepret.
                    </p>
                  </div>

                  <div
                    onClick={() => setRevealMode('delayed')}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: revealMode === 'delayed' ? 'rgba(194, 120, 3, 0.08)' : 'rgba(255, 255, 255, 0.8)',
                      border: revealMode === 'delayed' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Lock size={16} color={revealMode === 'delayed' ? '#C27803' : '#86868B'} />
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>Sensasi Cuci Roll (Ditunda)</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6E6E73', lineHeight: 1.4 }}>
                      Foto disimpan rahasia sampai acara selesai, lalu terbuka serentak bersama.
                    </p>
                  </div>
                </div>
              </div>

              {/* JIKA MEMILIH CUCI ROLL: PANEL JADWAL FLEKSIBEL + OPSI BUKA SEKARANG */}
              {revealMode === 'delayed' && (
                <div style={{ padding: '20px', background: 'rgba(194, 120, 3, 0.06)', borderRadius: '16px', border: '1px solid rgba(194, 120, 3, 0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Clock size={16} color="#C27803" />
                    <strong style={{ fontSize: '13px', color: '#1D1D1F' }}>
                      Atur Waktu Pengungkapan Roll Film
                    </strong>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '14px' }}>
                    Pilih jalan pintas jam acara selesai atau tentukan tanggal & jam bebas sesuka Anda:
                  </p>

                  {/* Quick Preset Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { label: 'Malam Ini 22:00', type: 'tonight' as const },
                      { label: 'Tengah Malam 23:59', type: 'midnight' as const },
                      { label: 'Besok Pagi 09:00', type: 'tomorrow_morning' as const },
                      { label: 'Besok Siang 12:00', type: 'tomorrow_noon' as const },
                      { label: '+24 Jam Dari Sekarang', type: 'after_24h' as const }
                    ].map((chip) => (
                      <button
                        key={chip.type}
                        type="button"
                        onClick={() => handleQuickRevealTime(chip.type)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          border: '1px solid rgba(194, 120, 3, 0.35)',
                          color: '#C27803',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual Datetime Picker */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#86868B', marginBottom: '6px' }}>
                      Atau Tentukan Tanggal & Jam Spesifik:
                    </label>
                    <input
                      type="datetime-local"
                      value={revealTime ? new Date(revealTime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setRevealTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="glass-input"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px' }}
                    />
                  </div>

                  {/* Jaminan Opsi Buka Sekarang */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.08)'
                  }}>
                    <Unlock size={20} color="#C27803" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '11.5px', color: '#515154' }}>
                      <strong style={{ color: '#1D1D1F' }}>Fleksibel: Opsi "Buka Sekarang" Selalu Tersedia.</strong>
                      <span style={{ display: 'block', marginTop: '2px', color: '#86868B' }}>
                        Walaupun jadwal telah diatur, Anda tetap bisa membuka album secara instan kapan saja melalui Dashboard tanpa menunggu hitung mundur habis.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Note Toggle */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block', marginBottom: '2px' }}>
                    Pesan Suara & Doa Tamu (Voice Note 15 Detik)
                  </strong>
                  <span style={{ fontSize: '12px', color: '#86868B' }}>
                    Saat jatah foto tamu habis, izinkan mereka merekam ucapan selamat & pesan suara penutup untuk Anda.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowVoiceNote}
                  onChange={(e) => setAllowVoiceNote(e.target.checked)}
                  style={{ width: '22px', height: '22px', accentColor: '#C27803', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-apple-black"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '16px',
                cursor: loading ? 'wait' : 'pointer'
              }}
            >
              <span>{loading ? 'Menyiapkan Album Digital...' : 'Terbitkan Album & Unduh Barcode Meja'}</span>
              <ArrowRight size={18} />
            </button>
            <span style={{ fontSize: '12px', color: '#86868B' }}>
              Album Anda akan langsung aktif dan kartu barcode meja siap dicetak seketika.
            </span>
          </div>

        </form>
      </main>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B' }}>Memuat formulir album...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}
