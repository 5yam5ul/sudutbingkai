'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Printer, ArrowLeft, Camera, Sliders, Palette, Layout, Type, Hash, Check } from 'lucide-react';
import { EventData } from '@/lib/types';

type CardFormat = 'tent' | 'standing' | 'mini';
type CardTheme = 'cream' | 'kraft' | 'charcoal';

export default function PrintTableCardPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Customizer State
  const [format, setFormat] = useState<CardFormat>('tent');
  const [theme, setTheme] = useState<CardTheme>('cream');
  const [customBadge, setCustomBadge] = useState<string>('KAMERA MEJA TAMU');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Sudut Pandangmu, Kenangan Kami');
  const [customHashtag, setCustomHashtag] = useState<string>('');
  const [customFooter, setCustomFooter] = useState<string>('Powered by SudutBingkai • Tanpa Perlu Download Aplikasi');
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [showHashtag, setShowHashtag] = useState<boolean>(true);

  useEffect(() => {
    // Fetch event details
    fetch(`/api/events?id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.event) {
          setEvent(data.event);
          setCustomTitle(data.event.title || 'Pernikahan Spesial');
          const cleanCouple = data.event.coupleOrHost?.replace(/[^a-zA-Z0-9]/g, '') || '';
          setCustomHashtag(cleanCouple ? `#${cleanCouple}Story` : '#SudutBingkai');
        }
      })
      .catch(console.error);

    // Generate QR Code
    if (typeof window !== 'undefined') {
      const guestUrl = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(guestUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#12100b',
          light: '#ffffff'
        }
      }).then(url => setQrDataUrl(url));
    }
  }, [eventId]);

  const handlePrint = () => {
    window.print();
  };

  // Theme styling definitions
  const getThemeStyles = () => {
    switch (theme) {
      case 'kraft':
        return {
          cardBg: '#F3EDE2',
          textColor: '#2E261D',
          mutedColor: '#7A6B5D',
          badgeBg: '#E5DACB',
          badgeBorder: '#BFA892',
          badgeText: '#5A4633',
          qrBorder: '#BFA892',
          qrBg: '#FAF7F2',
          stepCircleBg: '#2E261D',
          stepCircleColor: '#FFFFFF',
          dividerColor: '#DDD2C3',
          accentColor: '#8C673B'
        };
      case 'charcoal':
        return {
          cardBg: '#181715',
          textColor: '#FFFFFF',
          mutedColor: '#A1A1A6',
          badgeBg: 'rgba(255, 255, 255, 0.1)',
          badgeBorder: 'rgba(255, 255, 255, 0.2)',
          badgeText: '#F59E0B',
          qrBorder: 'rgba(255, 255, 255, 0.2)',
          qrBg: '#FFFFFF',
          stepCircleBg: '#F59E0B',
          stepCircleColor: '#12100B',
          dividerColor: 'rgba(255, 255, 255, 0.12)',
          accentColor: '#F59E0B'
        };
      case 'cream':
      default:
        return {
          cardBg: '#FFFFFF',
          textColor: '#1A1815',
          mutedColor: '#736D65',
          badgeBg: '#FAF3E0',
          badgeBorder: '#D4AF37',
          badgeText: '#8C6D16',
          qrBorder: '#D4AF37',
          qrBg: '#FAF8F5',
          stepCircleBg: '#1A1815',
          stepCircleColor: '#FFFFFF',
          dividerColor: '#EFECE6',
          accentColor: '#C27803'
        };
    }
  };

  const ts = getThemeStyles();

  // Helper render for single card content
  const renderCardBody = (isBackSide = false) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: format === 'mini' ? '24px 20px' : '36px 28px',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {/* Top Header */}
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: ts.badgeBg,
            border: `1px solid ${ts.badgeBorder}`,
            color: ts.badgeText,
            fontSize: format === 'mini' ? '9.5px' : '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px'
          }}
        >
          <Camera size={13} />
          <span>{customBadge || 'KAMERA MEJA TAMU'}</span>
        </div>

        <h1
          className="font-display-serif"
          style={{
            fontSize: format === 'mini' ? '20px' : '26px',
            color: ts.textColor,
            lineHeight: 1.2,
            marginBottom: '6px'
          }}
        >
          {customTitle || event?.title || 'Pernikahan Spesial'}
        </h1>

        <p style={{ fontSize: format === 'mini' ? '11px' : '13px', color: ts.mutedColor, fontWeight: 500, margin: 0 }}>
          {customSubtitle}
        </p>

        {showHashtag && customHashtag && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '6px',
              fontSize: format === 'mini' ? '10px' : '11.5px',
              fontFamily: 'var(--font-mono)',
              color: ts.accentColor,
              fontWeight: 600
            }}
          >
            {customHashtag}
          </span>
        )}
      </div>

      {/* QR Code Container */}
      <div
        style={{
          margin: format === 'mini' ? '16px 0' : '22px 0',
          padding: format === 'mini' ? '10px' : '14px',
          borderRadius: '18px',
          background: ts.qrBg,
          border: `2px dashed ${ts.qrBorder}`,
          display: 'inline-block'
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code Kamera Tamu"
            style={{
              width: format === 'mini' ? '150px' : '200px',
              height: format === 'mini' ? '150px' : '200px',
              display: 'block',
              borderRadius: '10px'
            }}
          />
        ) : (
          <div
            style={{
              width: format === 'mini' ? '150px' : '200px',
              height: format === 'mini' ? '150px' : '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ts.mutedColor,
              fontSize: '12px'
            }}
          >
            Membuat QR Code...
          </div>
        )}
      </div>

      {/* Step by step instructions */}
      <div style={{ width: '100%' }}>
        {showSteps && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: format === 'mini' ? '10px' : '16px', marginBottom: '18px' }}>
            <div style={{ textAlign: 'center', maxWidth: '85px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: ts.stepCircleBg,
                  color: ts.stepCircleColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  lineHeight: '20px',
                  marginBottom: '4px'
                }}
              >
                1
              </span>
              <p style={{ fontSize: format === 'mini' ? '9.5px' : '10.5px', color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                Scan QR di kamera HP
              </p>
            </div>

            <div style={{ textAlign: 'center', maxWidth: '85px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: ts.stepCircleBg,
                  color: ts.stepCircleColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  lineHeight: '20px',
                  marginBottom: '4px'
                }}
              >
                2
              </span>
              <p style={{ fontSize: format === 'mini' ? '9.5px' : '10.5px', color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                Isi nama & ambil rol
              </p>
            </div>

            <div style={{ textAlign: 'center', maxWidth: '85px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: ts.stepCircleBg,
                  color: ts.stepCircleColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  lineHeight: '20px',
                  marginBottom: '4px'
                }}
              >
                3
              </span>
              <p style={{ fontSize: format === 'mini' ? '9.5px' : '10.5px', color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                Jepret momen seru meja!
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: format === 'mini' ? '9px' : '10.5px',
            color: ts.mutedColor,
            letterSpacing: '0.03em',
            borderTop: `1px solid ${ts.dividerColor}`,
            paddingTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          {(event?.vendorName || eventId === 'wedding-sarah-dimas') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
              {(event?.vendorLogo || eventId === 'wedding-sarah-dimas') && (
                <span style={{ fontSize: '11px' }}>🏢</span>
              )}
              <span style={{ fontWeight: 700, color: ts.textColor, fontSize: format === 'mini' ? '9.5px' : '11px', letterSpacing: '0.5px' }}>
                Organized with love by {event?.vendorName || 'Vows & Co. Wedding Planner'}
              </span>
            </div>
          )}
          <span>{customFooter}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F2EB', color: '#1A1815' }}>
      {/* Top Non-print Bar */}
      <div
        className="no-print"
        style={{
          background: 'rgba(18, 17, 15, 0.96)',
          backdropFilter: 'blur(16px)',
          color: '#fff',
          padding: 'calc(12px + env(safe-area-inset-top, 0px)) 20px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            href={`/event/${eventId}`}
            style={{ color: '#86868B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Album</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#FBFBFA' }}>
            Editor & Cetak QR Meja Tamu
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#86868B' }} className="desktop-only">
            {format === 'tent' ? 'Format Tent Card (Lipat Berdiri Sendiri)' : format === 'standing' ? 'Format Standing A6 (Frame Akrilik)' : 'Format Mini Card'}
          </span>
          <button
            onClick={handlePrint}
            className="btn-apple-black"
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#C27803',
              border: 'none',
              boxShadow: '0 4px 14px rgba(194, 120, 3, 0.35)'
            }}
          >
            <Printer size={15} />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Print CSS Rules */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-workspace-container {
            padding: 0 !important;
            display: block !important;
          }
          .print-card-wrapper {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
          }
          .fold-guide-line {
            display: flex !important;
          }
        }
      `
        }}
      />

      {/* Workspace Grid (Editor Controls + Live Preview) */}
      <div
        className="print-workspace-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '28px 20px 80px',
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: '32px',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: Customizer Controls (Hidden when printing) */}
        <aside
          className="no-print glass-card"
          style={{
            borderRadius: '24px',
            padding: '24px 22px',
            background: 'rgba(255, 255, 255, 0.94)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)',
            position: 'sticky',
            top: '80px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
            <Sliders size={18} color="#C27803" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1D1D1F' }}>
              Pengaturan Desain Kartu
            </h2>
          </div>

          {/* 1. Format Card Options */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Layout size={14} color="#C27803" />
              <span>1. Format Bentuk Kartu</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFormat('tent')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: format === 'tent' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                  background: format === 'tent' ? 'rgba(194, 120, 3, 0.08)' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>Tent Card (Lipat Dua Tenda)</strong>
                  <span style={{ fontSize: '11px', color: '#86868B' }}>Dapat berdiri langsung di meja tanpa bingkai akrilik.</span>
                </div>
                {format === 'tent' && <Check size={16} color="#C27803" />}
              </button>

              <button
                type="button"
                onClick={() => setFormat('standing')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: format === 'standing' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                  background: format === 'standing' ? 'rgba(194, 120, 3, 0.08)' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>Standing A6 Frame</strong>
                  <span style={{ fontSize: '11px', color: '#86868B' }}>Ukuran standar 10x15cm untuk display acrylic standing.</span>
                </div>
                {format === 'standing' && <Check size={16} color="#C27803" />}
              </button>

              <button
                type="button"
                onClick={() => setFormat('mini')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: format === 'mini' ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.08)',
                  background: format === 'mini' ? 'rgba(194, 120, 3, 0.08)' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#1D1D1F', display: 'block' }}>Mini Card Ringkas</strong>
                  <span style={{ fontSize: '11px', color: '#86868B' }}>Ukuran compact untuk souvenir atau amplop ucapan.</span>
                </div>
                {format === 'mini' && <Check size={16} color="#C27803" />}
              </button>
            </div>
          </div>

          {/* 2. Aesthetic Theme Options */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Palette size={14} color="#C27803" />
              <span>2. Tema Warna & Kertas</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'cream', name: 'Cream Gold', bg: '#FFFFFF', border: '#D4AF37' },
                { id: 'kraft', name: 'Rustic Kraft', bg: '#F3EDE2', border: '#BFA892' },
                { id: 'charcoal', name: 'Charcoal', bg: '#181715', border: '#444' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as CardTheme)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '10px',
                    border: theme === t.id ? '2px solid #C27803' : '1px solid rgba(0,0,0,0.1)',
                    background: t.bg,
                    color: t.id === 'charcoal' ? '#FFFFFF' : '#1D1D1F',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: theme === t.id ? '0 0 0 2px rgba(194, 120, 3, 0.2)' : 'none'
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Text Customizer Inputs */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Type size={14} color="#C27803" />
              <span>3. Kustomisasi Tulisan</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>Badge Atas:</span>
                <input
                  type="text"
                  value={customBadge}
                  onChange={(e) => setCustomBadge(e.target.value)}
                  placeholder="KAMERA MEJA TAMU"
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>Nama Acara / Pasangan:</span>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Sarah & Dimas"
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>Tagline / Kalimat Sambut:</span>
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder="Sudut Pandangmu, Kenangan Kami"
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>Hashtag Acara:</span>
                <input
                  type="text"
                  value={customHashtag}
                  onChange={(e) => setCustomHashtag(e.target.value)}
                  placeholder="#SarahDimasStory"
                  className="input-field"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                />
              </div>
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1D1D1F', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showSteps}
                onChange={(e) => setShowSteps(e.target.checked)}
                style={{ accentColor: '#C27803' }}
              />
              <span>Tampilkan Panduan 3 Langkah (1-2-3)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1D1D1F', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showHashtag}
                onChange={(e) => setShowHashtag(e.target.checked)}
                style={{ accentColor: '#C27803' }}
              />
              <span>Tampilkan Hashtag Acara</span>
            </label>
          </div>
        </aside>

        {/* RIGHT COLUMN: Live Print Preview */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {format === 'tent' ? (
            /* TENT CARD: Two panels (front + back) with fold line */
            <div
              className="print-card-wrapper"
              style={{
                width: '100%',
                maxWidth: '430px',
                borderRadius: '24px',
                overflow: 'hidden',
                background: ts.cardBg,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                border: `1px solid ${ts.dividerColor}`
              }}
            >
              {/* Top Side (Back Panel when folded) */}
              <div style={{ height: '420px', borderBottom: `2px dashed ${ts.dividerColor}` }}>
                {renderCardBody(true)}
              </div>

              {/* Fold Indicator Line */}
              <div
                className="fold-guide-line"
                style={{
                  background: ts.badgeBg,
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: ts.mutedColor,
                  letterSpacing: '0.08em'
                }}
              >
                <span>✂️ LIPAT DI GARIS INI (STAND TENT CARD) ✂️</span>
              </div>

              {/* Bottom Side (Front Panel when folded) */}
              <div style={{ height: '420px' }}>
                {renderCardBody(false)}
              </div>
            </div>
          ) : format === 'standing' ? (
            /* STANDING A6 CARD */
            <div
              className="print-card-wrapper"
              style={{
                width: '100%',
                maxWidth: '410px',
                minHeight: '580px',
                borderRadius: '24px',
                overflow: 'hidden',
                background: ts.cardBg,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                border: `1px solid ${ts.dividerColor}`
              }}
            >
              {renderCardBody(false)}
            </div>
          ) : (
            /* MINI CARDS: 2 compact cards */
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  className="print-card-wrapper"
                  style={{
                    width: '320px',
                    minHeight: '440px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: ts.cardBg,
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${ts.dividerColor}`
                  }}
                >
                  {renderCardBody(false)}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
