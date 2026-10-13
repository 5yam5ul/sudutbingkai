'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import {
  Printer, ArrowLeft, Camera, Sliders, Palette, Layout, Type, Check, Scissors,
  Download, Share2, Box, Upload, X, ChevronLeft, ChevronRight,
  Send, Layers, Table as TableIcon, FileImage, ShieldCheck, CheckCircle2,
  Trash2, RefreshCw, Eye
} from 'lucide-react';
import { EventData } from '@/lib/types';

type CardFormat = 'tent' | 'standing' | 'mini';
type CardTheme = 'cream' | 'kraft' | 'charcoal';
type CardFont = 'serif' | 'sans' | 'mono';
type CardBorder = 'dashed' | 'double' | 'arch' | 'viewfinder';
type ViewMode = 'sheet' | '3d-fold';
type SidebarTab = 'design' | 'content' | 'table';

interface TableNumberConfig {
  enabled: boolean;
  mode: 'range' | 'custom';
  prefix: string;
  startNum: number;
  endNum: number;
  customListText: string;
}

const EVENT_PRESETS = [
  {
    id: 'wedding',
    name: 'Pernikahan Elegan',
    badge: 'MOMEN PERNIKAHAN',
    subtitle: 'Sudut Pandangmu, Kenangan Seumur Hidup Kami',
    steps: ['Scan QR kamera di meja', 'Isi nama & ambil rol', 'Jepret momen berharga!'] as [string, string, string],
    font: 'serif' as CardFont,
    theme: 'cream' as CardTheme,
    border: 'double' as CardBorder
  },
  {
    id: 'birthday',
    name: 'Pesta Ulang Tahun',
    badge: 'KAMERA PESTA SPESIAL',
    subtitle: 'Jepret Keseruan Pesta Ini dari Sudut Pandangmu!',
    steps: ['Scan QR di meja', 'Buka kamera analog', 'Abadikan tawa & pesta!'] as [string, string, string],
    font: 'sans' as CardFont,
    theme: 'kraft' as CardTheme,
    border: 'arch' as CardBorder
  },
  {
    id: 'corporate',
    name: 'Gathering & Reuni',
    badge: 'MOMEN KEBERSAMAAN',
    subtitle: 'Dokumentasikan Cerita dan Momen Kebersamaan',
    steps: ['Scan QR tanpa aplikasi', 'Buka rol kamera web', 'Tangkap keceriaan tim!'] as [string, string, string],
    font: 'sans' as CardFont,
    theme: 'charcoal' as CardTheme,
    border: 'viewfinder' as CardBorder
  },
  {
    id: 'minimalist',
    name: 'Minimalis Modern',
    badge: 'ANALOG GUEST CAMERA',
    subtitle: 'Capture the candid moments through your lens',
    steps: ['Scan QR code', 'Take your roll', 'Snap candid shots'] as [string, string, string],
    font: 'mono' as CardFont,
    theme: 'cream' as CardTheme,
    border: 'dashed' as CardBorder
  }
];

export default function PrintTableCardPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [guestCameraUrl, setGuestCameraUrl] = useState<string>('');

  // Sidebar Tab Navigation
  const [activeTab, setActiveTab] = useState<SidebarTab>('design');

  // Primary Customizer State
  const [format, setFormat] = useState<CardFormat>('tent');
  const [theme, setTheme] = useState<CardTheme>('cream');
  const [font, setFont] = useState<CardFont>('serif');
  const [borderStyle, setBorderStyle] = useState<CardBorder>('dashed');
  const [viewMode, setViewMode] = useState<ViewMode>('sheet');

  const [customBadge, setCustomBadge] = useState<string>('KAMERA TAMU SPESIAL');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Sudut Pandangmu, Kenangan Kami');
  const [customHashtag, setCustomHashtag] = useState<string>('');
  const [customFooter, setCustomFooter] = useState<string>('Powered by SudutBingkai • Tanpa Perlu Download Aplikasi');
  const [steps, setSteps] = useState<[string, string, string]>([
    'Scan QR di kamera HP',
    'Isi nama & ambil rol',
    'Jepret momen seru!'
  ]);
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [showHashtag, setShowHashtag] = useState<boolean>(true);

  // Logo / Co-branding State
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  // Table Numbering State
  const [tableConfig, setTableConfig] = useState<TableNumberConfig>({
    enabled: false,
    mode: 'range',
    prefix: 'Meja ',
    startNum: 1,
    endNum: 12,
    customListText: 'VIP 1, VIP 2, Keluarga Utama, Meja 1, Meja 2, Meja 3, Meja 4, Meja 5'
  });
  const [previewTableIndex, setPreviewTableIndex] = useState<number>(0);

  // Advanced Print & Layout States
  const [miniCount, setMiniCount] = useState<number>(6); // 2, 4, or 6 cards per A4 page
  const [standingCount, setStandingCount] = useState<number>(2); // 1 or 2 cards per A4 page
  const [inkSaver, setInkSaver] = useState<boolean>(false); // Clean white background for home/inkjet printing

  // Export Modal & Loading States
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

  const previewCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch event details
    fetch(`/api/events?id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.event) {
          setEvent(data.event);
          setCustomTitle(data.event.title || 'Momen Spesial');
          const cleanHost = data.event.coupleOrHost?.replace(/[^a-zA-Z0-9]/g, '') || '';
          setCustomHashtag(cleanHost ? `#${cleanHost}Story` : '#SudutBingkai');

          // Generate QR Code with slug preference
          if (typeof window !== 'undefined') {
            const slugOrId = data.event.slug || eventId;
            const guestUrl = `${window.location.origin}/cam/${slugOrId}`;
            setGuestCameraUrl(guestUrl);
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

  // Resolve table labels list
  const getTableList = (): string[] => {
    if (!tableConfig.enabled) return [''];
    if (tableConfig.mode === 'range') {
      const list: string[] = [];
      const start = Math.max(1, tableConfig.startNum);
      const end = Math.max(start, Math.min(start + 60, tableConfig.endNum));
      for (let i = start; i <= end; i++) {
        list.push(`${tableConfig.prefix}${i}`);
      }
      return list.length ? list : ['Meja 1'];
    } else {
      const items = tableConfig.customListText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      return items.length ? items : ['Meja Utama'];
    }
  };

  const tableList = getTableList();
  const currentTableLabel = tableConfig.enabled ? tableList[previewTableIndex] || tableList[0] : '';

  // Apply quick event preset
  const applyPreset = (preset: typeof EVENT_PRESETS[0]) => {
    setCustomBadge(preset.badge);
    setCustomSubtitle(preset.subtitle);
    setSteps(preset.steps);
    setFont(preset.font);
    setTheme(preset.theme);
    setBorderStyle(preset.border);
    toast.success(`Preset "${preset.name}" diterapkan.`);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomLogoUrl(reader.result as string);
      toast.success('Logo berhasil diunggah.');
    };
    reader.readAsDataURL(file);
  };

  // Export Single Card as High-Resolution PNG (300 DPI equivalent)
  const handleDownloadPng = async () => {
    if (!previewCardRef.current) return;
    setIsExportingPng(true);
    toast.info('Menyiapkan gambar kartu resolusi tinggi (300 DPI)...');

    try {
      const dataUrl = await toPng(previewCardRef.current, {
        pixelRatio: 3,
        quality: 1,
        backgroundColor: ts.cardBg
      });

      const fileName = `${event?.slug || eventId}-kartu-meja${currentTableLabel ? `-${currentTableLabel.replace(/\s+/g, '_')}` : ''}.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success('Kartu meja HD berhasil diunduh!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh gambar kartu. Coba gunakan fitur Simpan PDF.');
    } finally {
      setIsExportingPng(false);
    }
  };

  // Download Raw QR Code as HD PNG (1000px)
  const handleDownloadQrPng = async () => {
    if (!guestCameraUrl) return;
    try {
      const hdUrl = await QRCode.toDataURL(guestCameraUrl, {
        width: 1000,
        margin: 1,
        color: { dark: '#12100b', light: '#ffffff' }
      });
      const link = document.createElement('a');
      link.download = `${event?.slug || eventId}-qr-code-1000px.png`;
      link.href = hdUrl;
      link.click();
      toast.success('QR Code HD (1000x1000px) berhasil diunduh!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh QR Code.');
    }
  };

  // Download Raw QR Code as Vector SVG
  const handleDownloadQrSvg = async () => {
    if (!guestCameraUrl) return;
    try {
      const svgString = await QRCode.toString(guestCameraUrl, {
        type: 'svg',
        margin: 1,
        color: { dark: '#12100b', light: '#ffffff' }
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${event?.slug || eventId}-qr-code-vektor.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('QR Code Vektor (SVG) berhasil diunduh untuk Canva / Illustrator!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat QR Code SVG.');
    }
  };

  // Direct WhatsApp Share to Printing Vendor
  const handleShareToWhatsApp = () => {
    const formatName = format === 'tent' ? 'Tent Card (Lipat Dua Tenda Meja)' : format === 'standing' ? 'Standing A6 Frame (10x15cm)' : 'Mini Card Ringkas';
    const paperSpec = theme === 'kraft' ? 'Kertas Samson Kraft 250-280gsm' : 'Art Paper / Linen Paper 260-310gsm';
    const tableInfo = tableConfig.enabled ? `Total Meja: ${tableList.length} kartu (${tableList[0]} s/d ${tableList[tableList.length - 1]})` : 'Desain Kartu Standar';

    const text = encodeURIComponent(
      `Halo Percetakan! Saya ingin mencetak Kartu Meja Tamu untuk acara *${customTitle || event?.title || 'Spesial'}*.\n\n` +
      `Format: *${formatName}*\n` +
      `Tema Warna: *${theme === 'charcoal' ? 'Charcoal Dark' : theme === 'kraft' ? 'Rustic Kraft' : 'Cream Gold'}*\n` +
      `Spesifikasi Kertas: *${paperSpec}*\n` +
      `${tableInfo}\n\n` +
      `Tautan Desain & Print Langsung:\n${typeof window !== 'undefined' ? window.location.href : ''}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
        cardBorderColor: '#86868B'
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
          cardBorderColor: '#BFA892'
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
          cardBorderColor: 'rgba(255, 255, 255, 0.4)'
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
          cardBorderColor: '#D4AF37'
        };
    }
  };

  const ts = getThemeStyles();

  // Typography font family resolver
  const getFontFamily = (f: CardFont) => {
    switch (f) {
      case 'sans':
        return '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
      case 'mono':
        return 'var(--font-mono), "SF Mono", Monaco, Consolas, monospace';
      case 'serif':
      default:
        return 'var(--font-serif), "Playfair Display", Georgia, serif';
    }
  };

  // Helper render for single card content (calibrated carefully for Tent Card and Standing frames)
  const renderCardBody = (isBackSide = false, isCompact = false, tableLabel?: string) => {
    const isTent = format === 'tent';
    // Perfectly proportioned QR size: 116px for Tent cards prevents vertical truncation
    const qrSize = isCompact
      ? 96
      : (isTent ? 116 : (format === 'mini' ? (miniCount === 4 ? 115 : 125) : 150));

    const activeTable = tableLabel !== undefined ? tableLabel : currentTableLabel;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          padding: isCompact
            ? '12px 10px'
            : (isTent ? '16px 20px' : (format === 'mini' ? '18px 14px' : '26px 22px')),
          textAlign: 'center',
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: getFontFamily(font)
        }}
      >
        {/* Viewfinder Corner Accents (If Selected) */}
        {borderStyle === 'viewfinder' && (
          <>
            <span style={{ position: 'absolute', top: '10px', left: '10px', width: '12px', height: '12px', borderTop: `2px solid ${ts.accentColor}`, borderLeft: `2px solid ${ts.accentColor}` }} />
            <span style={{ position: 'absolute', top: '10px', right: '10px', width: '12px', height: '12px', borderTop: `2px solid ${ts.accentColor}`, borderRight: `2px solid ${ts.accentColor}` }} />
            <span style={{ position: 'absolute', bottom: '10px', left: '10px', width: '12px', height: '12px', borderBottom: `2px solid ${ts.accentColor}`, borderLeft: `2px solid ${ts.accentColor}` }} />
            <span style={{ position: 'absolute', bottom: '10px', right: '10px', width: '12px', height: '12px', borderBottom: `2px solid ${ts.accentColor}`, borderRight: `2px solid ${ts.accentColor}` }} />
          </>
        )}

        {/* Top Header */}
        <div style={{ width: '100%' }}>
          {/* Custom Logo (if uploaded) */}
          {customLogoUrl && (
            <div style={{ marginBottom: isCompact ? '4px' : (isTent ? '6px' : '8px'), display: 'flex', justifyContent: 'center' }}>
              <img
                src={customLogoUrl}
                alt="Logo Mitra"
                style={{
                  maxHeight: isCompact ? '22px' : (isTent ? '26px' : '32px'),
                  maxWidth: '110px',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* Table Number Badge (If Table Numbering Enabled) */}
          {activeTable && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: isCompact ? '2px 8px' : (isTent ? '3px 10px' : '4px 12px'),
                borderRadius: '8px',
                background: ts.accentColor,
                color: theme === 'charcoal' && !inkSaver ? '#181715' : '#FFFFFF',
                fontSize: isCompact ? '9.5px' : (isTent ? '11px' : '12px'),
                fontWeight: 800,
                letterSpacing: '0.06em',
                marginBottom: isCompact ? '4px' : (isTent ? '5px' : '8px'),
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <TableIcon size={isCompact ? 9 : (isTent ? 11 : 12)} />
              <span>{activeTable.toUpperCase()}</span>
            </div>
          )}

          {/* Badge Atas */}
          <div style={{ display: 'block' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: isCompact ? '2px 8px' : (isTent ? '3px 10px' : '4px 12px'),
                borderRadius: '999px',
                background: ts.badgeBg,
                border: `1px solid ${ts.badgeBorder}`,
                color: ts.badgeText,
                fontSize: isCompact ? '8px' : (isTent ? '9px' : '10.5px'),
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: isCompact ? '4px' : (isTent ? '5px' : '8px')
              }}
            >
              <Camera size={isCompact ? 10 : (isTent ? 11 : 12)} />
              <span>{customBadge || 'KAMERA TAMU SPESIAL'}</span>
            </div>
          </div>

          <h1
            style={{
              fontSize: isCompact ? '14px' : (isTent ? '20px' : (format === 'mini' ? '17px' : '23px')),
              color: ts.textColor,
              lineHeight: 1.2,
              marginBottom: isCompact ? '2px' : '4px',
              fontWeight: 700
            }}
          >
            {customTitle || event?.title || 'SudutBingkai Acara'}
          </h1>

          <p style={{ fontSize: isCompact ? '8.5px' : (isTent ? '10.5px' : (format === 'mini' ? '10px' : '12px')), color: ts.mutedColor, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
            {customSubtitle}
          </p>

          {showHashtag && customHashtag && (
            <span
              style={{
                display: 'inline-block',
                marginTop: isCompact ? '2px' : '4px',
                fontSize: isCompact ? '8px' : (isTent ? '9.5px' : (format === 'mini' ? '9px' : '11px')),
                fontFamily: 'var(--font-mono), monospace',
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
            margin: isCompact ? '4px 0' : (isTent ? '7px 0' : (format === 'mini' ? '10px 0' : '16px 0')),
            padding: isCompact ? '4px' : (isTent ? '7px' : (format === 'mini' ? '8px' : '12px')),
            borderRadius: isCompact ? '10px' : '14px',
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
                borderRadius: '6px'
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: isCompact ? '6px' : (isTent ? '8px' : '12px'), marginBottom: isCompact ? '6px' : (isTent ? '7px' : '12px') }}>
              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : (isTent ? '78px' : '85px') }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    height: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '7.5px' : (isTent ? '8px' : '9px'),
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    marginBottom: '2px'
                  }}
                >
                  1
                </span>
                <p style={{ fontSize: isCompact ? '7px' : (isTent ? '8px' : '9.5px'), color: ts.mutedColor, lineHeight: 1.2, margin: 0 }}>
                  {steps[0]}
                </p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : (isTent ? '78px' : '85px') }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    height: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '7.5px' : (isTent ? '8px' : '9px'),
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    marginBottom: '2px'
                  }}
                >
                  2
                </span>
                <p style={{ fontSize: isCompact ? '7px' : (isTent ? '8px' : '9.5px'), color: ts.mutedColor, lineHeight: 1.2, margin: 0 }}>
                  {steps[1]}
                </p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: isCompact ? '68px' : (isTent ? '78px' : '85px') }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    height: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    borderRadius: '50%',
                    background: ts.stepCircleBg,
                    color: ts.stepCircleColor,
                    fontSize: isCompact ? '7.5px' : (isTent ? '8px' : '9px'),
                    fontWeight: 'bold',
                    lineHeight: isCompact ? '15px' : (isTent ? '16px' : '18px'),
                    marginBottom: '2px'
                  }}
                >
                  3
                </span>
                <p style={{ fontSize: isCompact ? '7px' : (isTent ? '8px' : '9.5px'), color: ts.mutedColor, lineHeight: 1.2, margin: 0 }}>
                  {steps[2]}
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: isCompact ? '7px' : (isTent ? '8px' : '9.5px'),
              color: ts.mutedColor,
              letterSpacing: '0.03em',
              borderTop: `1px solid ${ts.dividerColor}`,
              paddingTop: isCompact ? '4px' : (isTent ? '6px' : '8px'),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            {event?.vendorName && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '1px' }}>
                <span style={{ fontWeight: 700, color: ts.textColor, fontSize: isCompact ? '7.5px' : (isTent ? '8.5px' : '10px'), letterSpacing: '0.5px' }}>
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

  // Border frame style resolver
  const getCardBorderStyle = () => {
    switch (borderStyle) {
      case 'double':
        return `3px double ${ts.cardBorderColor}`;
      case 'arch':
        return `1.5px solid ${ts.cardBorderColor}`;
      case 'viewfinder':
        return `1px solid ${ts.cardBorderColor}`;
      case 'dashed':
      default:
        return `1.5px dashed ${ts.cardBorderColor}`;
    }
  };

  const getCardBorderRadius = () => {
    if (borderStyle === 'arch') {
      return format === 'tent' ? '120px 120px 20px 20px' : '80px 80px 20px 20px';
    }
    return format === 'mini' ? '16px' : '20px';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F2EB', color: '#1A1815' }}>
      {/* Dynamic CSS Styling for Refined Apple-grade Studio Inputs & Precise A4 Print Geometry */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .studio-input {
          width: 100%;
          padding: 10px 13px;
          font-size: 13px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #FFFFFF;
          color: #1D1D1F;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          font-family: inherit;
        }
        .studio-input:focus {
          border-color: #C27803 !important;
          box-shadow: 0 0 0 3px rgba(194, 120, 3, 0.14) !important;
          background: #FFFFFF !important;
        }
        .studio-tab-btn {
          flex: 1;
          padding: 8px 10px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.18s ease;
        }
        .studio-choice-btn {
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #FFFFFF;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .studio-choice-btn:hover {
          border-color: #C27803;
        }
        .studio-choice-btn.active {
          border: 2px solid #C27803;
          background: rgba(194, 120, 3, 0.07);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
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
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 0 !important;
          }
          .tent-card-sheet {
            height: 282mm !important;
            max-height: 282mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .tent-back-panel, .tent-front-panel {
            height: 136mm !important;
            max-height: 136mm !important;
            box-sizing: border-box !important;
          }
          .fold-guide-line {
            height: 8mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .tent-back-panel {
            transform: rotate(180deg) !important;
            transform-origin: center center !important;
          }
        }
      `
        }}
      />

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
            href={`/event/${event?.slug || eventId}`}
            style={{ color: '#86868B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Album</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#FBFBFA' }}>
            Studio Desain & Cetak Kartu Meja
          </span>
        </div>

        {/* View Mode Toggle (Sheet vs 3D Fold) */}
        {format === 'tent' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'sheet' ? '#C27803' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Layers size={13} />
              <span>Lembar A4</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d-fold')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === '3d-fold' ? '#C27803' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Box size={13} />
              <span>Simulasi Meja 3D</span>
            </button>
          </div>
        )}

        {/* Action Buttons Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Download Raw QR */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="glass-pill"
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.15)'
            }}
            title="Unduh QR Code mentah untuk Canva / Photoshop"
          >
            <FileImage size={14} />
            <span>Unduh QR Mentah</span>
          </button>

          {/* Export HD PNG */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExportingPng}
            className="glass-pill"
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              cursor: isExportingPng ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.15)'
            }}
            title="Unduh gambar PNG 300 DPI siap kirim ke percetakan"
          >
            <Download size={14} />
            <span>{isExportingPng ? 'Memproses...' : 'Unduh PNG HD'}</span>
          </button>

          {/* Share to WhatsApp */}
          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="glass-pill"
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(37, 211, 102, 0.15)',
              color: '#25D366',
              border: '1px solid rgba(37, 211, 102, 0.3)'
            }}
            title="Kirim spesifikasi ke percetakan via WhatsApp"
          >
            <Send size={13} />
            <span>Kirim Percetakan</span>
          </button>

          {/* Print / Save PDF */}
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
              background: 'linear-gradient(135deg, #C27803 0%, #9A5E02 100%)',
              border: 'none',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(194, 120, 3, 0.35)'
            }}
          >
            <Printer size={15} />
            <span>{tableConfig.enabled ? `Cetak ${tableList.length} Meja PDF` : 'Cetak / Simpan PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar Controls + Live Preview) */}
      <div
        className="print-workspace-container"
        style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '24px 20px 80px',
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          gap: '32px',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: Modern Studio Sidebar with 3 Clean Tabs */}
        <aside
          className="no-print glass-card"
          style={{
            borderRadius: '24px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: '80px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto'
          }}
        >
          {/* Studio Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(194, 120, 3, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803' }}>
              <Sliders size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1D1D1F' }}>
                Studio Kartu Meja
              </h2>
              <span style={{ fontSize: '11px', color: '#86868B' }}>
                Kustomisasi tampilan, teks, dan penomoran meja
              </span>
            </div>
          </div>

          {/* Segmented Control 3 Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.05)', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className="studio-tab-btn"
              style={{
                background: activeTab === 'design' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'design' ? '#1D1D1F' : '#6E6E73',
                boxShadow: activeTab === 'design' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Palette size={13} color={activeTab === 'design' ? '#C27803' : '#6E6E73'} />
              <span>Desain & Vibe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className="studio-tab-btn"
              style={{
                background: activeTab === 'content' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'content' ? '#1D1D1F' : '#6E6E73',
                boxShadow: activeTab === 'content' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Type size={13} color={activeTab === 'content' ? '#C27803' : '#6E6E73'} />
              <span>Teks & Logo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className="studio-tab-btn"
              style={{
                background: activeTab === 'table' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'table' ? '#1D1D1F' : '#6E6E73',
                boxShadow: activeTab === 'table' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <TableIcon size={13} color={activeTab === 'table' ? '#C27803' : '#6E6E73'} />
              <span>Nomor Meja</span>
            </button>
          </div>

          {/* TAB 1: DESAIN & VIBE */}
          {activeTab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Quick Event Presets */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Sliders size={13} color="#C27803" />
                  <span>Preset Cepat Gaya Acara</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px' }}>
                  {EVENT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="studio-choice-btn"
                      style={{ padding: '9px 11px' }}
                    >
                      <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>{p.name}</strong>
                      <span style={{ fontSize: '10px', color: '#86868B' }}>{p.theme} • {p.font}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Bentuk Kartu */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Layout size={13} color="#C27803" />
                  <span>Format Bentuk Kartu</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {[
                    { id: 'tent', name: 'Tent Card (Lipat Tenda Meja)', desc: 'Dapat berdiri langsung tanpa bingkai akrilik.' },
                    { id: 'standing', name: 'Standing A6 Frame', desc: 'Ukuran standar 10x15cm untuk standing frame akrilik.' },
                    { id: 'mini', name: 'Mini Card Ringkas', desc: 'Ukuran hemat untuk souvenir atau amplop ucapan.' }
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id as CardFormat)}
                      className={`studio-choice-btn ${format === fmt.id ? 'active' : ''}`}
                      style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>{fmt.name}</strong>
                        <span style={{ fontSize: '10.5px', color: '#86868B' }}>{fmt.desc}</span>
                      </div>
                      {format === fmt.id && <CheckCircle2 size={16} color="#C27803" />}
                    </button>
                  ))}
                </div>

                {/* Sub-selector for Standing / Mini */}
                {format === 'mini' && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                      Jumlah Kartu per Lembar A4:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { count: 6, label: '6 Kartu' },
                        { count: 4, label: '4 Kartu' },
                        { count: 2, label: '2 Kartu' }
                      ].map(opt => (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setMiniCount(opt.count)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: miniCount === opt.count ? 700 : 500,
                            background: miniCount === opt.count ? '#1D1D1F' : '#FFFFFF',
                            color: miniCount === opt.count ? '#FFFFFF' : '#1D1D1F',
                            border: miniCount === opt.count ? 'none' : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {format === 'standing' && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1D1D1F', display: 'block', marginBottom: '5px' }}>
                      Jumlah Kartu per Lembar A4:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      {[
                        { count: 2, label: '2 Kartu (Pasangan)' },
                        { count: 1, label: '1 Kartu (Tunggal)' }
                      ].map(opt => (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setStandingCount(opt.count)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: standingCount === opt.count ? 700 : 500,
                            background: standingCount === opt.count ? '#1D1D1F' : '#FFFFFF',
                            color: standingCount === opt.count ? '#FFFFFF' : '#1D1D1F',
                            border: standingCount === opt.count ? 'none' : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tipografi & Bingkai */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Type size={13} color="#C27803" />
                  <span>Gaya Font & Bingkai</span>
                </label>

                {/* Font Choices */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { id: 'serif', label: 'Serif Elegan' },
                    { id: 'sans', label: 'Modern Sans' },
                    { id: 'mono', label: 'Mono Film' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFont(f.id as CardFont)}
                      className={`studio-choice-btn ${font === f.id ? 'active' : ''}`}
                      style={{ padding: '7px 4px', textAlign: 'center', fontSize: '11px', fontWeight: font === f.id ? 700 : 500 }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Border Frame Choices */}
                <span style={{ fontSize: '10.5px', color: '#86868B', display: 'block', marginBottom: '4px' }}>Ornamen Garis Bingkai:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'dashed', label: 'Garis Potong Putus' },
                    { id: 'double', label: 'Double Gold Line' },
                    { id: 'arch', label: 'Modern Arch' },
                    { id: 'viewfinder', label: 'Fokus Viewfinder' }
                  ].map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBorderStyle(b.id as CardBorder)}
                      className={`studio-choice-btn ${borderStyle === b.id ? 'active' : ''}`}
                      style={{ padding: '7px 8px', fontSize: '11px', fontWeight: borderStyle === b.id ? 700 : 500 }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema Warna & Kertas */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Palette size={13} color="#C27803" />
                  <span>Tema Warna & Kertas</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'cream', name: 'Cream Gold', bg: '#FAF3E0', color: '#C27803' },
                    { id: 'kraft', name: 'Rustic Kraft', bg: '#F3EDE2', color: '#8C673B' },
                    { id: 'charcoal', name: 'Charcoal Dark', bg: '#181715', color: '#FFFFFF' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as CardTheme)}
                      className={`studio-choice-btn ${theme === t.id ? 'active' : ''}`}
                      style={{ padding: '8px 6px', textAlign: 'center' }}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(0,0,0,0.15)', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#1D1D1F', display: 'block' }}>{t.name}</span>
                    </button>
                  ))}
                </div>

                {/* Ink Saver Toggle */}
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: '#1D1D1F', cursor: 'pointer', background: 'rgba(0,0,0,0.025)', padding: '8px 10px', borderRadius: '10px' }}>
                    <input
                      type="checkbox"
                      checked={inkSaver}
                      onChange={(e) => setInkSaver(e.target.checked)}
                      style={{ accentColor: '#C27803', marginTop: '2px' }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, display: 'block' }}>Mode Hemat Tinta (Latar Putih)</span>
                      <span style={{ fontSize: '10px', color: '#86868B', lineHeight: 1.3, display: 'block' }}>
                        Menjaga latar putih bersih untuk menghemat tinta printer rumah.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KONTEN & LOGO */}
          {activeTab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Co-Branding Logo Uploader */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Upload size={13} color="#C27803" />
                  <span>Logo Mitra WO / Sponsor</span>
                </label>

                {customLogoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <img src={customLogoUrl} alt="Logo" style={{ maxHeight: '28px', maxWidth: '110px', objectFit: 'contain' }} />
                    <button
                      type="button"
                      onClick={() => setCustomLogoUrl('')}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1.5px dashed rgba(194, 120, 3, 0.4)',
                        background: 'rgba(194, 120, 3, 0.04)',
                        color: '#C27803',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={14} />
                      <span>Unggah Logo (PNG Transparan / JPEG)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Badge Atas */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '4px' }}>
                  Badge Atas:
                </label>
                <input
                  type="text"
                  value={customBadge}
                  onChange={(e) => setCustomBadge(e.target.value)}
                  placeholder="KAMERA TAMU SPESIAL"
                  className="studio-input"
                />
              </div>

              {/* Nama Acara / Tuan Rumah */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '4px' }}>
                  Nama Acara / Pasangan:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Contoh: Kevin & Cindy"
                  className="studio-input"
                />
              </div>

              {/* Tagline / Kalimat Sambut */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '4px' }}>
                  Tagline / Kalimat Sambut:
                </label>
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder="Sudut Pandangmu, Kenangan Kami"
                  className="studio-input"
                />
              </div>

              {/* Hashtag Acara */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '4px' }}>
                  Hashtag Acara:
                </label>
                <input
                  type="text"
                  value={customHashtag}
                  onChange={(e) => setCustomHashtag(e.target.value)}
                  placeholder="#SarahDimasStory"
                  className="studio-input"
                />
              </div>

              {/* Toggles */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#1D1D1F', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showSteps}
                    onChange={(e) => setShowSteps(e.target.checked)}
                    style={{ accentColor: '#C27803' }}
                  />
                  <span>Tampilkan Panduan 3 Langkah (1-2-3)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#1D1D1F', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showHashtag}
                    onChange={(e) => setShowHashtag(e.target.checked)}
                    style={{ accentColor: '#C27803' }}
                  />
                  <span>Tampilkan Hashtag Acara</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: NOMOR MEJA & CETAK */}
          {activeTab === 'table' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Batch Table Numbering Card */}
              <div style={{ padding: '14px', background: 'rgba(194, 120, 3, 0.05)', borderRadius: '16px', border: '1px solid rgba(194, 120, 3, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tableConfig.enabled}
                      onChange={(e) => setTableConfig({ ...tableConfig, enabled: e.target.checked })}
                      style={{ accentColor: '#C27803' }}
                    />
                    <TableIcon size={14} color="#C27803" />
                    <span>Cetak Nomor Meja Otomatis</span>
                  </label>
                  {tableConfig.enabled && (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#C27803', background: 'rgba(194,120,3,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
                      {tableList.length} Meja
                    </span>
                  )}
                </div>

                {tableConfig.enabled ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setTableConfig({ ...tableConfig, mode: 'range' })}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: tableConfig.mode === 'range' ? 700 : 500,
                          background: tableConfig.mode === 'range' ? '#1D1D1F' : '#FFFFFF',
                          color: tableConfig.mode === 'range' ? '#FFFFFF' : '#1D1D1F',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Nomor Urut (1 s/d N)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableConfig({ ...tableConfig, mode: 'custom' })}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: tableConfig.mode === 'custom' ? 700 : 500,
                          background: tableConfig.mode === 'custom' ? '#1D1D1F' : '#FFFFFF',
                          color: tableConfig.mode === 'custom' ? '#FFFFFF' : '#1D1D1F',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Daftar Nama Custom
                      </button>
                    </div>

                    {tableConfig.mode === 'range' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '10.5px', color: '#6E6E73', display: 'block', marginBottom: '3px' }}>
                            Awalan Teks Meja:
                          </label>
                          <input
                            type="text"
                            value={tableConfig.prefix}
                            onChange={(e) => setTableConfig({ ...tableConfig, prefix: e.target.value })}
                            placeholder="Contoh: Meja "
                            className="studio-input"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '10.5px', color: '#6E6E73', display: 'block', marginBottom: '3px' }}>
                              Nomor Awal:
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={tableConfig.startNum}
                              onChange={(e) => setTableConfig({ ...tableConfig, startNum: parseInt(e.target.value) || 1 })}
                              className="studio-input"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10.5px', color: '#6E6E73', display: 'block', marginBottom: '3px' }}>
                              Nomor Akhir:
                            </label>
                            <input
                              type="number"
                              min={tableConfig.startNum}
                              max={60}
                              value={tableConfig.endNum}
                              onChange={(e) => setTableConfig({ ...tableConfig, endNum: parseInt(e.target.value) || 1 })}
                              className="studio-input"
                            />
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '10.5px', color: '#8C6D16', lineHeight: 1.4 }}>
                          Sistem akan mencetak {tableList.length} halaman A4 berurutan ({tableList[0]} s/d {tableList[tableList.length - 1]}) dalam 1 dokumen PDF.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: '10.5px', color: '#6E6E73', display: 'block', marginBottom: '3px' }}>
                          Pisahkan nama meja dengan koma atau baris baru:
                        </label>
                        <textarea
                          rows={3}
                          value={tableConfig.customListText}
                          onChange={(e) => setTableConfig({ ...tableConfig, customListText: e.target.value })}
                          placeholder="VIP 1, VIP 2, Meja Keluarga, Meja 1, Meja 2"
                          className="studio-input"
                          style={{ resize: 'vertical' }}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: '10.5px', color: '#8C6D16' }}>
                          Total {tableList.length} kartu meja terdaftar.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '11px', color: '#86868B', lineHeight: 1.4 }}>
                    Aktifkan untuk mencetak kartu meja dengan nomor urut atau nama meja custom tanpa harus mengedit satu per satu.
                  </p>
                )}
              </div>

              {/* Print Guidance Tips Callout */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '11px',
                  color: '#555555',
                  lineHeight: 1.5
                }}
              >
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', color: '#1D1D1F' }}>
                  <Printer size={13} color="#C27803" />
                  <span>Tips Cetak Sempurna:</span>
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <li>
                    Di jendela browser print, <b>centang "Background graphics"</b> agar warna tema tercetak solid.
                  </li>
                  <li>
                    <b>Hilangkan centang "Headers and footers"</b> agar URL browser tidak ikut tercetak di tepi kertas.
                  </li>
                  <li>
                    Rekomendasi kertas: <b>Art Paper 260/310gsm</b> atau <b>Samson Kraft</b> agar kartu kokoh saat berdiri.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: Live Print Preview / 3D Simulation */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Table Number Navigation Bar (If Enabled) */}
          {tableConfig.enabled && (
            <div
              className="no-print"
              style={{
                width: '100%',
                maxWidth: '520px',
                marginBottom: '16px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TableIcon size={15} color="#C27803" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F' }}>
                  Preview: {currentTableLabel} ({previewTableIndex + 1} dari {tableList.length})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  disabled={previewTableIndex <= 0}
                  onClick={() => setPreviewTableIndex(Math.max(0, previewTableIndex - 1))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: '#FFFFFF',
                    cursor: previewTableIndex <= 0 ? 'not-allowed' : 'pointer',
                    opacity: previewTableIndex <= 0 ? 0.4 : 1
                  }}
                  title="Meja Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>
                <select
                  value={previewTableIndex}
                  onChange={(e) => setPreviewTableIndex(parseInt(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '11.5px',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  {tableList.map((tbl, idx) => (
                    <option key={idx} value={idx}>
                      {tbl}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={previewTableIndex >= tableList.length - 1}
                  onClick={() => setPreviewTableIndex(Math.min(tableList.length - 1, previewTableIndex + 1))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: '#FFFFFF',
                    cursor: previewTableIndex >= tableList.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: previewTableIndex >= tableList.length - 1 ? 0.4 : 1
                  }}
                  title="Meja Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* 3D TENT FOLD SIMULATION VIEW */}
          {format === 'tent' && viewMode === '3d-fold' ? (
            <div
              className="no-print"
              style={{
                width: '100%',
                maxWidth: '600px',
                height: '620px',
                background: 'linear-gradient(180deg, #ECE7DE 0%, #D8D2C5 100%)',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 48px rgba(0,0,0,0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '16px', left: '20px', zIndex: 10 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Simulasi Lipatan Meja (3D Tent Card)
                </span>
                <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                  Begini tampilan kartu saat ditekuk dan berdiri di atas meja perjamuan.
                </p>
              </div>

              {/* Table Surface Reflection */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '60px',
                  width: '380px',
                  height: '80px',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}
              />

              {/* 3D Standing Fold Container */}
              <div
                style={{
                  perspective: '1200px',
                  width: '300px',
                  height: '420px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '290px',
                    height: '380px',
                    background: ts.cardBg,
                    borderRadius: '16px',
                    boxShadow: '0 24px 50px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
                    border: getCardBorderStyle(),
                    transform: 'rotateX(14deg) rotateY(-8deg)',
                    transformStyle: 'preserve-3d',
                    overflow: 'hidden'
                  }}
                >
                  {renderCardBody(false, true, currentTableLabel)}
                </div>
              </div>

              <div style={{ position: 'absolute', bottom: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('sheet')}
                  className="btn-apple-black"
                  style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Kembali ke Mode Lembar A4
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD PRINT SHEET PREVIEW */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* SCREEN PREVIEW WRAPPER (Referenced by toPng for HD Export) */}
              <div ref={previewCardRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {format === 'tent' ? (
                  /* TENT CARD: Two panels (front + back) with fold line - Perfectly calibrated to prevent clipping */
                  <div
                    className="print-card-wrapper tent-card-sheet"
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      borderRadius: getCardBorderRadius(),
                      overflow: 'hidden',
                      background: ts.cardBg,
                      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                      border: getCardBorderStyle()
                    }}
                  >
                    {/* Top Side (Back Panel when folded - Rotated 180° for true Tent folding) */}
                    <div
                      className="tent-back-panel"
                      style={{
                        height: '380px',
                        borderBottom: `2px dashed ${ts.dividerColor}`,
                        transform: 'rotate(180deg)',
                        transformOrigin: 'center center'
                      }}
                    >
                      {renderCardBody(true, false, currentTableLabel)}
                    </div>

                    {/* Fold Indicator Line */}
                    <div
                      className="fold-guide-line"
                      style={{
                        background: ts.badgeBg,
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono), monospace',
                        color: ts.mutedColor,
                        letterSpacing: '0.08em',
                        borderTop: `1px dashed ${ts.dividerColor}`,
                        borderBottom: `1px dashed ${ts.dividerColor}`
                      }}
                    >
                      <Scissors size={12} />
                      <span>GARIS LIPAT MEJA (FOLD LINE - TENT CARD)</span>
                      <Scissors size={12} />
                    </div>

                    {/* Bottom Side (Front Panel when folded) */}
                    <div className="tent-front-panel" style={{ height: '380px' }}>
                      {renderCardBody(false, false, currentTableLabel)}
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
                          borderRadius: getCardBorderRadius(),
                          overflow: 'hidden',
                          background: ts.cardBg,
                          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.12)',
                          border: getCardBorderStyle(),
                          margin: '0 auto'
                        }}
                      >
                        {renderCardBody(false, false, currentTableLabel)}
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
                          borderRadius: getCardBorderRadius(),
                          overflow: 'hidden',
                          background: ts.cardBg,
                          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                          border: getCardBorderStyle(),
                          minHeight: miniCount === 6 ? '290px' : (miniCount === 4 ? '360px' : '430px'),
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {renderCardBody(false, miniCount === 6, currentTableLabel)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRINT-ONLY MULTI-PAGE CONTAINER (Active during window.print() when table numbering is active) */}
              {tableConfig.enabled && (
                <div className="print-only-batch-tables" style={{ display: 'none' }}>
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                    @media print {
                      .print-only-batch-tables {
                        display: block !important;
                      }
                      .print-card-wrapper {
                        display: none !important;
                      }
                    }
                  `
                    }}
                  />
                  {tableList.map((tblName, tblIdx) => (
                    <div
                      key={tblIdx}
                      className="print-page-break"
                      style={{
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '94vh',
                        padding: '6mm 0'
                      }}
                    >
                      {format === 'tent' ? (
                        <div
                          className="tent-card-sheet"
                          style={{
                            width: '100%',
                            maxWidth: '420px',
                            borderRadius: getCardBorderRadius(),
                            overflow: 'hidden',
                            background: ts.cardBg,
                            border: getCardBorderStyle()
                          }}
                        >
                          <div
                            className="tent-back-panel"
                            style={{
                              height: '380px',
                              borderBottom: `2px dashed ${ts.dividerColor}`,
                              transform: 'rotate(180deg)',
                              transformOrigin: 'center center'
                            }}
                          >
                            {renderCardBody(true, false, tblName)}
                          </div>
                          <div
                            className="fold-guide-line"
                            style={{
                              background: ts.badgeBg,
                              padding: '6px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              fontSize: '10px',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono), monospace',
                              color: ts.mutedColor
                            }}
                          >
                            <Scissors size={12} />
                            <span>GARIS LIPAT MEJA ({tblName})</span>
                            <Scissors size={12} />
                          </div>
                          <div className="tent-front-panel" style={{ height: '380px' }}>
                            {renderCardBody(false, false, tblName)}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '345px',
                            minHeight: '520px',
                            borderRadius: getCardBorderRadius(),
                            overflow: 'hidden',
                            background: ts.cardBg,
                            border: getCardBorderStyle()
                          }}
                        >
                          {renderCardBody(false, false, tblName)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* RAW QR CODE EXPORT MODAL */}
      {showQrModal && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '24px',
              padding: '28px',
              background: '#FFFFFF',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(194,120,3,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803', margin: '0 auto 12px' }}>
                <FileImage size={22} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px' }}>
                Unduh QR Code Kamera Tamu
              </h3>
              <p style={{ fontSize: '12.5px', color: '#86868B', margin: 0, lineHeight: 1.5 }}>
                Gunakan file ini jika Anda ingin mendesain kartu meja sendiri di Canva, Photoshop, atau Adobe Illustrator.
              </p>
            </div>

            {/* QR Code Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
              <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QR Code" width={180} height={180} style={{ display: 'block', borderRadius: '8px' }} />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="btn-apple-black"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} />
                <span>Unduh PNG Resolusi Tinggi (1000 x 1000 px)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrSvg}
                className="glass-pill"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.12)',
                  color: '#1D1D1F',
                  fontWeight: 600
                }}
              >
                <Download size={15} />
                <span>Unduh Vektor SVG (Untuk Canva & Illustrator)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(guestCameraUrl);
                  toast.success('Tautan kamera tamu disalin ke clipboard!');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#C27803',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px',
                  fontWeight: 600
                }}
              >
                Salin Tautan Kamera Web Tamu Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
