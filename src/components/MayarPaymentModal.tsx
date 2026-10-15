'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, QrCode, CreditCard, ShieldCheck, X, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MayarPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  description: string;
  amount: number;
  invoiceId?: string;
  isSimulation?: boolean;
}

export default function MayarPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  amount,
  invoiceId = 'INV-MYR-PREVIEW',
  isSimulation = true
}: MayarPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'qris' | 'bca_va' | 'mandiri_va'>('qris');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
      onSuccess();
    }, 900);
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'min(92vh, 680px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #FAF9F6, #FFFFFF)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px'
              }}>
                M
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1D1D1F' }}>Mayar Checkout</span>
                  {isSimulation && (
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      background: 'rgba(194, 120, 3, 0.12)',
                      color: '#C27803',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em'
                    }}>
                      SANDBOX SIMULATOR
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#86868B' }}>Infrastruktur Pembayaran SudutBingkai</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0, 0, 0, 0.04)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#515154'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px' }}>
            {/* Amount Banner */}
            <div style={{
              background: '#F5F5F7',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#86868B', display: 'block', marginBottom: '4px' }}>
                TOTAL PEMBAYARAN
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
                {formattedPrice}
              </div>
              <div style={{ fontSize: '12.5px', color: '#515154', marginTop: '4px', fontWeight: 500 }}>
                {title}
              </div>
            </div>

            {/* Simulation Notice if waiting for KYC */}
            {isSimulation && (
              <div style={{
                background: 'rgba(194, 120, 3, 0.08)',
                border: '1px solid rgba(194, 120, 3, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '11.5px',
                lineHeight: 1.5,
                color: '#7C4800'
              }}>
                <strong>Mode Simulasi Transaksi:</strong> Gateway pembayaran sedang proses verifikasi akun Mayar. Anda dapat menyelesaikan transaksi simulasi di bawah untuk mengaktifkan paket secara langsung.
              </div>
            )}

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6E6E73', display: 'block', marginBottom: '10px' }}>
                PILIH METODE PEMBAYARAN
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={() => setSelectedMethod('qris')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: selectedMethod === 'qris' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)',
                    background: selectedMethod === 'qris' ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(194, 120, 3, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C27803' }}>
                      <QrCode size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>QRIS (Scan Bebas)</div>
                      <div style={{ fontSize: '11px', color: '#86868B' }}>BCA Mobile, Livin, GoPay, ShopeePay, OVO, Dana</div>
                    </div>
                  </div>
                  {selectedMethod === 'qris' && <CheckCircle2 size={18} color="#C27803" />}
                </div>

                <div
                  onClick={() => setSelectedMethod('bca_va')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: selectedMethod === 'bca_va' ? '2px solid #C27803' : '1px solid rgba(0, 0, 0, 0.08)',
                    background: selectedMethod === 'bca_va' ? 'rgba(194, 120, 3, 0.04)' : '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D1D1F' }}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>BCA Virtual Account</div>
                      <div style={{ fontSize: '11px', color: '#86868B' }}>Verifikasi otomatis 24 jam</div>
                    </div>
                  </div>
                  {selectedMethod === 'bca_va' && <CheckCircle2 size={18} color="#C27803" />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleSimulateSuccess}
                disabled={isProcessing}
                className="btn-apple-black"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memverifikasi Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#4ade80" />
                    <span>{isSimulation ? 'Simulasikan Bayar Berhasil' : 'Bayar Sekarang'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#86868B', marginTop: '4px' }}>
                <ShieldCheck size={13} color="#16a34a" />
                <span>Enkripsi 256-bit SSL • Keamanan Resmi Berlisensi BI</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
