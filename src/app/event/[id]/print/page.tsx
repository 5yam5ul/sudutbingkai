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
  const [customBadge, setCustomBadge] = useState<string>('KAMERA TAMU SPESIAL');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Sudut Pandangmu, Kenangan Kami');
  const [customHashtag, setCustomHashtag] = useState<string>('');
  const [customFooter, setCustomFooter] = useState<string>('Powered by SudutBingkai • Tanpa Perlu Download Aplikasi');
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [showHashtag, setShowHashtag] = useState<boolean>(true);

  // Advanced Print & Layout States
  const [miniCount, setMiniCount] = useState<number>(6); // 2, 4, or 6 cards per A4 page
  const [standingCount, setStandingCount] = useState<number>(2); // 1 or 2 cards per A4 page
  const [inkSaver, setInkSaver] = useState<boolean>(false); // Clean white background for home/inkjet printing

  useEffect(() => {
    // Fetch event details
    fetch(`/api/events?id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.event) {
          setEvent(data.event);
          setCustomTitle(data.event.title || 'Momen Spesial');
          const cleanCouple = data.event.coupleOrHost?.replace(/[^a-zA-Z0-9]/g, '') || '';
          setCustomHashtag(cleanCouple ? `#${cleanCouple}Story` : '#SudutBingkai');

          // Generate QR Code with slug preference
          if (typeof window !== 'undefined') {
            const slugOrId = data.event.slug || eventId;
            const guestUrl = `${window.location.origin}/cam/${slugOrId}`;
            QRCode.toDataURL(guestUrl, {
              width: 400,
              margin: 1,
              color: {
                dark: '#12100b',
                light: '#ffffff'
              }
            }).then(url => setQrDataUrl(url));
          }
        }
      })
      .catch(console.error);
  }, [eventId]);

  const handlePrint = () => {
    window.print();
  };

  // Theme styling definitions with Ink-Saver fallback
  const getThemeStyles = () => {
    if (inkSaver) {
      return {
        cardBg: '#FFFFFF',
        textColor: '#1A1815',
        mutedColor: '#555555',
        badgeBg: '#F4F4F5',
        badgeBorder: theme === 'charcoal' ? '#1D1D1F' : theme === 'kraft' ? '#8C673B' : '#D4AF37',
        badgeText: theme === 'charcoal' ? '#1D1D1F' : theme === 'kraft' ? '#5A4633' : '#8C6D16',
        qrBorder: theme === 'charcoal' ? '#1D1D1F' : theme === 'kraft' ? '#8C673B' : '#D4AF37',
        qrBg: '#FFFFFF',
        stepCircleBg: '#1D1D1F',
        stepCircleColor: '#FFFFFF',
        dividerColor: 'rgba(0, 0, 0, 0.15)',
        accentColor: theme === 'charcoal' ? '#1D1D1F' : theme === 'kraft' ? '#8C673B' : '#C27803',
        cardBorder: '1.5px dashed #86868B'
      };
    }

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
          accentColor: '#8C673B',
          cardBorder: '1.5px dashed #BFA892'
        };
      case 'charcoal':
        return {
          cardBg: '#181715',
          textColor: '#FFFFFF',
          mutedColor: '#A1A1A6',
          badgeBg: 'rgba(255, 255, 255, 0.12)',
          badgeBorder: 'rgba(255, 255, 255, 0.25)',
          badgeText: '#F59E0B',
          qrBorder: 'rgba(255, 255, 255, 0.25)',
          qrBg: '#FFFFFF',
          stepCircleBg: '#F59E0B',
          stepCircleColor: '#12100B',
          dividerColor: 'rgba(255, 255, 255, 0.15)',
          accentColor: '#F59E0B',
          cardBorder: '1.5px dashed rgba(255, 255, 255, 0.4)'
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
          accentColor: '#C27803',
          cardBorder: '1.5px dashed #D4AF37'
        };
    }
  };

  const ts = getThemeStyles();

  // Helper render for single card content
  const renderCardBody = (isBackSide = false, isCompact = false) => {
    const qrSize = isCompact 
      ? 110 
      : (format === 'mini' ? (miniCount === 4 ? 130 : 145) : (format === 'standing' ? 175 : 190));

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          padding: isCompact ? '16px 12px' : (format === 'mini' ? '24px 18px' : '36px 28px'),
          textAlign: 'center',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Header */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: isCompact ? '3px 10px' : '4px 12px',
              borderRadius: '999px',
              background: ts.badgeBg,
              border: `1px solid ${ts.badgeBorder}`,
              color: ts.badgeText,
              fontSize: isCompact ? '8.5px' : (format === 'mini' ? '9.5px' : '11px'),
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: isCompact ? '6px' : '12px'
            }}
          >
            <Camera size={isCompact ? 11 : 13} />
            <span>{customBadge || 'KAMERA TAMU SPESIAL'}</span>
          </div>

          <h1
            className="font-display-serif"
            style={{
              fontSize: isCompact ? '15px' : (format === 'mini' ? '19px' : '25px'),
              color: ts.textColor,
              lineHeight: 1.2,
              marginBottom: isCompact ? '3px' : '6px',
              fontWeight: 700
            }}
          >
            {customTitle || event?.title || 'SudutBingkai Acara'}
          </h1>

          <p style={{ fontSize: isCompact ? '9.5px' : (format === 'mini' ? '11px' : '13px'), color: ts.mutedColor, fontWeight: 500, margin: 0 }}>
            {customSubtitle}
          </p>

          {showHashtag && customHashtag && (
            <span
              style={{
                display: 'inline-block',
                marginTop: isCompact ? '3px' : '6px',
                fontSize: isCompact ? '9px' : (format === 'mini' ? '10px' : '11.5px'),
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
            margin: isCompact ? '8px 0' : (format === 'mini' ? '14px 0' : '20px 0'),
            padding: isCompact ? '6px' : (format === 'mini' ? '10px' : '14px'),
            borderRadius: isCompact ? '12px' : '18px',
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
                width: `${qrSize}px`,
                height: `${qrSize}px`,
                display: 'block',
                borderRadius: '8px'
              }}
            />
          ) : (
            <div
              style={{
                width: `${qrSize}px`,
                height: `${qrSize}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ts.mutedColor,
                fontSize: '11px'
              }}
            >
              Membuat QR...
            </div>
          )}
        </div>

        {/* Step by step instructions */}
        <div style={{ width: '100%' }}>
          {showSteps && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: isCompact ? '6px' : (format === 'mini' ? '10px' : '16px'), marginBottom: isCompact ? '10px' : '16px' }}>
              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : '85px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '17px' : '20px',
                    height: isCompact ? '17px' : '20px',
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '8.5px' : '10px',
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '17px' : '20px',
                    marginBottom: '3px'
                  }}
                >
                  1
                </span>
                <p style={{ fontSize: isCompact ? '8px' : (format === 'mini' ? '9.5px' : '10.5px'), color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                  Scan QR di kamera HP
                </p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : '85px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '17px' : '20px',
                    height: isCompact ? '17px' : '20px',
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '8.5px' : '10px',
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '17px' : '20px',
                    marginBottom: '3px'
                  }}
                >
                  2
                </span>
                <p style={{ fontSize: isCompact ? '8px' : (format === 'mini' ? '9.5px' : '10.5px'), color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                  Isi nama & ambil rol
                </p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : '85px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '17px' : '20px',
                    height: isCompact ? '17px' : '20px',
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '8.5px' : '10px',
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '17px' : '20px',
                    marginBottom: '3px'
                  }}
                >
                  3
                </span>
                <p style={{ fontSize: isCompact ? '8px' : (format === 'mini' ? '9.5px' : '10.5px'), color: ts.mutedColor, lineHeight: 1.25, margin: 0 }}>
                  Jepret momen seru!
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: isCompact ? '7.5px' : (format === 'mini' ? '9px' : '10.5px'),
              color: ts.mutedColor,
              letterSpacing: '0.03em',
              borderTop: `1px solid ${ts.dividerColor}`,
              paddingTop: isCompact ? '6px' : '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            {event?.vendorName && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ fontWeight: 700, color: ts.textColor, fontSize: isCompact ? '8.5px' : (format === 'mini' ? '9.5px' : '11px'), letterSpacing: '0.5px' }}>
                  Organized with love by {event.vendorName}
                </span>
              </div>
            )}
            <span>{customFooter}</span>
          </div>
        </div>
      </div>
    );
  };

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
            Editor & Cetak Kartu QR Tamu
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
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .print-workspace-container {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            max-width: 100% !important;
          }
          .print-card-wrapper {
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .fold-guide-line {
            display: flex !important;
          }
          .tent-back-panel {
            transform: rotate(180deg) !important;
            transform-origin: center center !important;
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

            {/* Sub-selector for Mini Card Count */}
            {format === 'mini' && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Jumlah Kartu per Lembar A4:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { count: 6, label: '6 Kartu (Rekomendasi)' },
                    { count: 4, label: '4 Kartu' },
                    { count: 2, label: '2 Kartu' }
                  ].map(opt => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setMiniCount(opt.count)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: miniCount === opt.count ? 700 : 500,
                        background: miniCount === opt.count ? '#1D1D1F' : '#FFFFFF',
                        color: miniCount === opt.count ? '#FFFFFF' : '#1D1D1F',
                        border: miniCount === opt.count ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-selector for Standing A6 Count */}
            {format === 'standing' && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '6px' }}>
                  Jumlah Kartu per Lembar A4:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { count: 2, label: '2 Kartu (Pasangan 1 Lembar A4)' },
                    { count: 1, label: '1 Kartu (Tunggal)' }
                  ].map(opt => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setStandingCount(opt.count)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: standingCount === opt.count ? 700 : 500,
                        background: standingCount === opt.count ? '#1D1D1F' : '#FFFFFF',
                        color: standingCount === opt.count ? '#FFFFFF' : '#1D1D1F',
                        border: standingCount === opt.count ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

            {/* Ink Saver Checkbox */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: '#1D1D1F', cursor: 'pointer', background: 'rgba(0,0,0,0.03)', padding: '8px 10px', borderRadius: '10px' }}>
                <input
                  type="checkbox"
                  checked={inkSaver}
                  onChange={(e) => setInkSaver(e.target.checked)}
                  style={{ accentColor: '#C27803', marginTop: '2px' }}
                />
                <div>
                  <span style={{ fontWeight: 600, display: 'block' }}>Mode Hemat Tinta (Latar Putih)</span>
                  <span style={{ fontSize: '10px', color: '#86868B', lineHeight: 1.3, display: 'block' }}>
                    Menjaga latar tetap putih bersih agar tidak boros tinta hitam printer standar.
                  </span>
                </div>
              </label>
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
                  placeholder="KAMERA TAMU SPESIAL"
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
                  placeholder="Contoh: Kevin & Cindy"
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

          {/* Print Guidance Callout */}
          <div
            style={{
              background: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.25)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginTop: '18px',
              fontSize: '11.5px',
              color: '#8C6D16',
              lineHeight: 1.5
            }}
          >
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#B45309' }}>
              🖨️ Tips Cetak / Simpan PDF Sempurna:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                Di jendela print browser, <b>wajib centang "Background graphics"</b> (Grafik latar belakang) agar warna tema {theme === 'charcoal' && !inkSaver ? 'Charcoal Gelap' : theme === 'kraft' ? 'Rustic Kraft' : 'Cream Gold'} tercetak pekat.
              </li>
              <li>
                <b>Hilangkan centang "Headers and footers"</b> agar URL browser dan tanggal di tepi kertas tidak ikut tercetak.
              </li>
              <li>
                Setiap kartu dilengkapi garis putus-putus untuk mempermudah pemotongan dengan gunting atau cutter.
              </li>
            </ul>
          </div>
        </aside>

        {/* RIGHT COLUMN: Live Print Preview */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {format === 'tent' ? (
            /* TENT CARD: Two panels (front + back) with fold line */
            <div
              className="print-card-wrapper"
              style={{
                width: '100%',
                maxWidth: '430px',
                borderRadius: '20px',
                overflow: 'hidden',
                background: ts.cardBg,
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                border: `1.5px dashed ${theme === 'charcoal' && !inkSaver ? 'rgba(255,255,255,0.35)' : '#86868B'}`
              }}
            >
              {/* Top Side (Back Panel when folded - Rotated 180° for true Tent folding) */}
              <div
                className="tent-back-panel"
                style={{
                  height: '410px',
                  borderBottom: `2px dashed ${ts.dividerColor}`,
                  transform: 'rotate(180deg)',
                  transformOrigin: 'center center'
                }}
              >
                {renderCardBody(true, false)}
              </div>

              {/* Fold Indicator Line */}
              <div
                className="fold-guide-line"
                style={{
                  background: ts.badgeBg,
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: ts.mutedColor,
                  letterSpacing: '0.08em',
                  borderTop: `1px dashed ${ts.dividerColor}`,
                  borderBottom: `1px dashed ${ts.dividerColor}`
                }}
              >
                <span>✂️ GARIS LIPAT MEJA (FOLD LINE - TENT CARD) ✂️</span>
              </div>

              {/* Bottom Side (Front Panel when folded) */}
              <div style={{ height: '410px' }}>
                {renderCardBody(false, false)}
              </div>
            </div>
          ) : format === 'standing' ? (
            /* STANDING A6 CARD */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: standingCount === 2 ? 'repeat(auto-fit, minmax(290px, 1fr))' : '1fr',
                gap: '24px',
                width: '100%',
                maxWidth: standingCount === 2 ? '700px' : '410px',
                margin: '0 auto'
              }}
            >
              {Array.from({ length: standingCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="print-card-wrapper"
                  style={{
                    width: '100%',
                    maxWidth: '345px',
                    minHeight: '520px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: ts.cardBg,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                    border: `1.5px dashed ${theme === 'charcoal' && !inkSaver ? 'rgba(255,255,255,0.35)' : '#86868B'}`,
                    margin: '0 auto'
                  }}
                >
                  {renderCardBody(false, false)}
                </div>
              ))}
            </div>
          ) : (
            /* MINI CARDS: 2, 4, or 6 compact cards */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: miniCount === 6 ? 'repeat(2, 1fr)' : (miniCount === 4 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))'),
                gap: miniCount === 6 ? '12px' : '20px',
                width: '100%',
                maxWidth: '680px',
                margin: '0 auto'
              }}
            >
              {Array.from({ length: miniCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="print-card-wrapper"
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: ts.cardBg,
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                    border: `1.5px dashed ${theme === 'charcoal' && !inkSaver ? 'rgba(255,255,255,0.35)' : '#86868B'}`,
                    minHeight: miniCount === 6 ? '290px' : (miniCount === 4 ? '360px' : '430px'),
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {renderCardBody(false, miniCount === 6)}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
