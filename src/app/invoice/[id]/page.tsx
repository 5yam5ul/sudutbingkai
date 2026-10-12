'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, ArrowLeft, CheckCircle2, Share2, 
  Calendar, Building2, User, Mail, Phone, ShieldCheck, 
  Download, ExternalLink, Sparkles 
} from 'lucide-react';
import { InvoiceRecord } from '@/lib/types';
import SkeletonLoader from '@/components/SkeletonLoader';
import { toast } from 'sonner';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices?id=${encodeURIComponent(invoiceId)}`);
        const data = await res.json();
        if (data.success && data.invoice) {
          setInvoice(data.invoice);
        } else {
          setInvoice(null);
        }
      } catch (err) {
        console.error('Gagal memuat invoice:', err);
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!invoice) return;
    const text = encodeURIComponent(
      `*INVOICE PEMBAYARAN RESMI SUDUT BINGKAI*\n` +
      `No. Invoice: ${invoice.invoiceNumber}\n` +
      `Klien: ${invoice.buyerName}\n` +
      `Paket: ${invoice.tierName}\n` +
      `Total: Rp ${invoice.finalAmount.toLocaleString('id-ID')}\n` +
      `Status: LUNAS (PAID)\n\n` +
      `Lihat e-Receipt resmi di: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const copyInvoiceLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Tautan invoice berhasil disalin!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <SkeletonLoader title="Memuat Dokumen Invoice..." subtitle="Menyiapkan rincian tagihan resmi dan bukti pelunasan elektronik" />;
  }

  if (!invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBFBFA', padding: '20px' }}>
        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '40px 24px', textAlign: 'center', borderRadius: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1D1D1F' }}>Invoice Tidak Ditemukan</h2>
          <p style={{ color: '#6E6E73', fontSize: '14px', marginBottom: '24px' }}>
            Nomor invoice atau ID transaksi yang Anda tuju tidak terdaftar di sistem kami.
          </p>
          <Link href="/" className="btn-apple-black" style={{ padding: '10px 24px', fontSize: '13px', textDecoration: 'none' }}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const formattedDate = new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = new Date(invoice.paidAt || invoice.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F7', padding: '32px 16px', color: '#1D1D1F' }}>
      {/* Print-hide style helper */}
      <style>{`
        @media print {
          body { background: #FFFFFF !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .invoice-paper { box-shadow: none !important; border: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Top Action Bar (Screen Only) */}
      <div className="no-print" style={{ maxWidth: '820px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#6E6E73',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={copyInvoiceLink}
            className="glass-pill"
            style={{ padding: '8px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Share2 size={14} />
            <span>{copied ? 'Tersalin!' : 'Salin Tautan'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="glass-pill"
            style={{ padding: '8px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#25D366' }}
          >
            <span>💬 WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-apple-black"
            style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Printer size={15} />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Letterhead Sheet */}
      <div
        className="invoice-paper"
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '48px 48px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Paid Stamp Watermark Seal */}
        {isPaid && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '48px',
              border: '3px solid #10B981',
              borderRadius: '14px',
              padding: '8px 20px',
              color: '#10B981',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              transform: 'rotate(-6deg)',
              pointerEvents: 'none',
              background: 'rgba(16, 185, 129, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={20} />
            <span>LUNAS / PAID</span>
          </div>
        )}

        {/* Letterhead Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', paddingBottom: '32px', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img
                src="/sudut-bingkai-logo.png"
                alt="Sudut Bingkai"
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <span style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#C27803', fontWeight: 700, display: 'block' }}>
              DIGITAL DISPOSABLE CAMERA & LIVE GALLERY
            </span>
            <p style={{ fontSize: '12px', color: '#86868B', margin: '4px 0 0' }}>
              PT Sudut Bingkai Kreatif Indonesia • Jakarta, Indonesia
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#86868B', fontWeight: 600, display: 'block' }}>
              BUKTI PEMBAYARAN ELEKTRONIK
            </span>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, margin: '4px 0 6px', color: '#1D1D1F' }}>
              {invoice.invoiceNumber}
            </h1>
            <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0 }}>
              Tanggal: <strong>{formattedDate}</strong> • {formattedTime} WIB
            </p>
          </div>
        </div>

        {/* Bill To & Bill From Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px', padding: '32px 0', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#86868B', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              DITERBITKAN OLEH:
            </span>
            <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
              Sudut Bingkai Official Billing
            </strong>
            <p style={{ fontSize: '13px', color: '#515154', lineHeight: 1.6, margin: 0 }}>
              Email: billing@sudutbingkai.id<br />
              Website: https://sudutbingkai.vercel.app<br />
              Layanan: Sistem Kamera Tamu Digital Acara
            </p>
          </div>

          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#86868B', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
              DITUJUKAN KEPADA:
            </span>
            <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
              {invoice.buyerName}
            </strong>
            {invoice.companyName && (
              <span style={{ fontSize: '13px', color: '#C27803', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                🏢 {invoice.companyName}
              </span>
            )}
            <p style={{ fontSize: '13px', color: '#515154', lineHeight: 1.6, margin: 0 }}>
              Email: {invoice.buyerEmail}<br />
              {invoice.buyerPhone && `No. WhatsApp: ${invoice.buyerPhone}`}<br />
              Tipe Pelanggan: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{invoice.buyerType === 'vendor' ? 'Mitra Vendor Resmi (Reseller)' : 'Klien Penyelenggara Acara'}</span>
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ padding: '28px 0', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #1D1D1F' }}>
                <th style={{ padding: '10px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1D1D1F' }}>
                  Deskripsi Layanan & Lisensi Paket
                </th>
                <th style={{ padding: '10px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1D1D1F', textAlign: 'right' }}>
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '18px 0 6px', verticalAlign: 'top' }}>
                  <strong style={{ fontSize: '15px', color: '#1D1D1F', display: 'block', marginBottom: '4px' }}>
                    Lisensi Paket {invoice.tierName}
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#6E6E73', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
                    Akses penuh roll film analog tamu digital, live screen slideshow ballroom, kompresi foto HD, pesan suara tamu (*audio voice notes*), unduh arsip ZIP resolusi penuh, dan album kenangan bersama.
                    {invoice.eventId && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#C27803' }}>
                        ID Acara: <strong>{invoice.eventId}</strong>
                      </span>
                    )}
                  </p>
                </td>
                <td style={{ padding: '18px 0 6px', textAlign: 'right', verticalAlign: 'top', fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>
                  Rp {invoice.originalPrice.toLocaleString('id-ID')}
                </td>
              </tr>

              {/* Discount Row if applied */}
              {invoice.discountAmount > 0 && (
                <tr style={{ color: '#10B981' }}>
                  <td style={{ padding: '8px 0', fontSize: '13px' }}>
                    <span>🏷️ Potongan Diskon Kemitraan {invoice.discountCode ? `(Kode Promo: ${invoice.discountCode})` : ''}</span>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '13.5px', fontWeight: 600 }}>
                    -Rp {invoice.discountAmount.toLocaleString('id-ID')}
                  </td>
                </tr>
              )}

              <tr>
                <td style={{ padding: '8px 0', fontSize: '13px', color: '#6E6E73' }}>
                  <span>Biaya Gateway & Layanan Cloud Storage</span>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '13px', color: '#10B981', fontWeight: 600 }}>
                  GRATIS (Termasuk)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculation Summary & Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 0 32px' }}>
          <div style={{ width: '100%', maxWidth: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: '#6E6E73' }}>
              <span>Subtotal:</span>
              <span>Rp {invoice.originalPrice.toLocaleString('id-ID')}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: '#10B981', fontWeight: 600 }}>
                <span>Diskon Mitra:</span>
                <span>-Rp {invoice.discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', borderTop: '2px solid #1D1D1F', marginTop: '8px', fontSize: '18px', fontWeight: 800, color: '#1D1D1F' }}>
              <span>Total Pelunasan:</span>
              <span style={{ color: '#C27803' }}>Rp {invoice.finalAmount.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', marginTop: '2px' }}>
              *Sudah termasuk PPN dan biaya pemeliharaan server
            </div>
          </div>
        </div>

        {/* Payment Confirmation & Legal Electronic Stamp */}
        <div style={{ backgroundColor: '#FBFBFA', borderRadius: '16px', padding: '20px 24px', border: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '13.5px', color: '#1D1D1F', display: 'block' }}>
                Pembayaran Sah & Terverifikasi Otomatis
              </strong>
              <span style={{ fontSize: '12px', color: '#6E6E73' }}>
                Kanal: {invoice.paymentMethod.toUpperCase()} • ID Referensi: {invoice.orderId}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#86868B', display: 'block' }}>Waktu Pelunasan:</span>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>
              {formattedDate}, {formattedTime} WIB
            </span>
          </div>
        </div>

        {/* Electronic Signature & Legal Notice */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '440px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#86868B', display: 'block', marginBottom: '4px' }}>
              CATATAN HUKUM:
            </span>
            <p style={{ fontSize: '11px', color: '#86868B', lineHeight: 1.5, margin: 0 }}>
              Dokumen ini merupakan bukti transaksi elektronik yang sah yang diterbitkan oleh sistem Sudut Bingkai Indonesia dan berkekuatan hukum sesuai UU ITE No. 11 Tahun 2008. Tidak memerlukan tanda tangan basah fisik.
            </p>
          </div>

          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 6px', borderRadius: '50%', border: '2px solid #C27803', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF9' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1px dashed #C27803', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#C27803', textAlign: 'center', lineHeight: 1.2 }}>
                SUDUT<br />BINGKAI<br />VERIFIED
              </div>
            </div>
            <strong style={{ fontSize: '12px', color: '#1D1D1F', display: 'block' }}>
              Billing & Treasury System
            </strong>
            <span style={{ fontSize: '10.5px', color: '#86868B' }}>
              Sudut Bingkai Indonesia
            </span>
          </div>
        </div>
      </div>

      {/* Screen-only Bottom Navigation */}
      <div className="no-print" style={{ maxWidth: '820px', margin: '24px auto 0', textAlign: 'center' }}>
        {invoice.eventId && (
          <Link
            href={`/event/${invoice.eventId}`}
            style={{
              fontSize: '13px',
              color: '#C27803',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Buka Galeri Acara Terkait</span>
            <ExternalLink size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
