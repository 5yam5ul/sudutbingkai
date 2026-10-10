'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Printer, ArrowLeft, Camera } from 'lucide-react';
import { EventData } from '@/lib/types';

export default function PrintTableCardPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Fetch event details
    fetch(`/api/events?id=${eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.event) {
          setEvent(data.event);
        }
      })
      .catch(console.error);

    // Generate QR Code
    if (typeof window !== 'undefined') {
      const guestUrl = `${window.location.origin}/cam/${eventId}`;
      QRCode.toDataURL(guestUrl, {
        width: 400,
        margin: 2,
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

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2eb', color: '#1a1815' }}>
      {/* Non-print toolbar */}
      <div className="no-print" style={{
        background: '#0c0b0a',
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href={`/event/${eventId}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <ArrowLeft size={16} />
          <span>Kembali ke Dashboard</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Format A6 Standar Display Meja
          </span>
          <button onClick={handlePrint} className="btn-gold" style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}>
            <Printer size={16} />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .print-card-container {
            box-shadow: none !important;
            border: 2px solid #ddd !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Main Print Container */}
      <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div
          className="print-card-container"
          style={{
            background: '#fff',
            width: '100%',
            maxWidth: '420px',
            borderRadius: '24px',
            padding: '40px 32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
            textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Header Card */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: '#faf3e0',
              border: '1px solid #d4af37',
              color: '#8c6d16',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              <Camera size={14} />
              <span>KAMERA MEJA TAMU</span>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontFamily: 'var(--font-display)',
              color: '#1a1815',
              lineHeight: 1.2,
              marginBottom: '6px'
            }}>
              {event?.title || 'Pernikahan Spesial'}
            </h1>
            <p style={{ fontSize: '13px', color: '#736d65', fontWeight: '500' }}>
              Sudut Pandangmu, Kenangan Kami
            </p>
          </div>

          {/* QR Code Container */}
          <div style={{
            margin: '28px 0',
            padding: '16px',
            borderRadius: '20px',
            background: '#faf8f5',
            border: '2px dashed #d4af37',
            display: 'inline-block'
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Kamera Tamu" style={{ width: '220px', height: '220px', display: 'block', borderRadius: '12px' }} />
            ) : (
              <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Membuat QR Code...
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', maxWidth: '100px' }}>
                <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: '#1a1815', color: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: '24px', marginBottom: '4px' }}>1</span>
                <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.3 }}>Scan QR lewat kamera HP</p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '100px' }}>
                <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: '#1a1815', color: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: '24px', marginBottom: '4px' }}>2</span>
                <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.3 }}>Ketik namamu & ambil rol</p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '100px' }}>
                <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', background: '#1a1815', color: '#fff', fontSize: '11px', fontWeight: 'bold', lineHeight: '24px', marginBottom: '4px' }}>3</span>
                <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.3 }}>Jepret momen seru meja!</p>
              </div>
            </div>

            <div style={{
              fontSize: '11px',
              color: '#888',
              letterSpacing: '0.04em',
              borderTop: '1px solid #eee',
              paddingTop: '14px'
            }}>
              Powered by <strong>SudutBingkai</strong> • Tanpa Perlu Download Aplikasi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
