'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 size={24} style={{ color: '#EF4444' }} />,
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconBorder: '1px solid rgba(239, 68, 68, 0.2)',
          confirmBtnBg: '#EF4444',
          confirmBtnHover: '#DC2626',
          confirmBtnColor: '#FFFFFF',
          badgeText: 'PERINGATAN HAPUS'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} style={{ color: '#C27803' }} />,
          iconBg: 'rgba(194, 120, 3, 0.1)',
          iconBorder: '1px solid rgba(194, 120, 3, 0.2)',
          confirmBtnBg: '#C27803',
          confirmBtnHover: '#A36202',
          confirmBtnColor: '#FFFFFF',
          badgeText: 'KONFIRMASI AKSI'
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle size={24} style={{ color: '#1D1D1F' }} />,
          iconBg: 'rgba(0, 0, 0, 0.05)',
          iconBorder: '1px solid rgba(0, 0, 0, 0.08)',
          confirmBtnBg: '#1D1D1F',
          confirmBtnHover: '#000000',
          confirmBtnColor: '#FFFFFF',
          badgeText: 'KONFIRMASI'
        };
    }
  };

  const v = getVariantStyles();

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backgroundColor: 'rgba(18, 17, 15, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onCancel();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '430px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.04)',
              border: 'none',
              cursor: 'pointer',
              color: '#86868B',
              transition: 'background 0.2s'
            }}
          >
            <X size={16} />
          </button>

          <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
            {/* Top Icon Badge */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: v.iconBg,
                border: v.iconBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              {v.icon}
            </div>

            <span
              className="font-mono-film"
              style={{
                fontSize: '11px',
                color: variant === 'danger' ? '#EF4444' : '#C27803',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              {v.badgeText}
            </span>

            <h3
              className="font-display-serif"
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#1D1D1F',
                lineHeight: 1.25,
                marginBottom: '10px'
              }}
            >
              {title}
            </h3>

            <p
              style={{
                color: '#6E6E73',
                fontSize: '13.5px',
                lineHeight: 1.55,
                margin: '0 0 24px',
                padding: '0 8px'
              }}
            >
              {description}
            </p>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                style={{
                  padding: '12px 18px',
                  borderRadius: '999px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  background: 'rgba(0, 0, 0, 0.03)',
                  color: '#1D1D1F',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  padding: '12px 18px',
                  borderRadius: '999px',
                  border: 'none',
                  background: v.confirmBtnBg,
                  color: v.confirmBtnColor,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.15s, opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isLoading ? 'Memproses...' : confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
