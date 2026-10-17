'use client';

import React from 'react';
import { Language } from '@/lib/i18n';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'light' | 'dark' | 'glass';
  className?: string;
}

export default function LanguageSwitcher({
  currentLang,
  onLanguageChange,
  variant = 'light',
  className = ''
}: LanguageSwitcherProps) {
  const isEn = currentLang === 'en';
  const isDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Pilih Bahasa / Select Language"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        width: '86px',
        height: '32px',
        borderRadius: '999px',
        padding: '2px',
        backgroundColor: isDark ? 'rgba(30, 27, 24, 0.85)' : 'rgba(0, 0, 0, 0.06)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Sliding Active Pill */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '3px',
          bottom: '3px',
          left: '3px',
          width: 'calc(50% - 3px)',
          borderRadius: '999px',
          backgroundColor: isDark ? '#D97706' : '#1D1D1F',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
          transform: isEn ? 'translateX(100%)' : 'translateX(0%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* ID Button */}
      <button
        type="button"
        onClick={() => onLanguageChange('id')}
        aria-pressed={!isEn}
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: !isEn ? '#FFFFFF' : (isDark ? '#A1A1A6' : '#6E6E73'),
          fontSize: '11.5px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s ease',
          outline: 'none',
          padding: 0
        }}
      >
        ID
      </button>

      {/* EN Button */}
      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        aria-pressed={isEn}
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: isEn ? '#FFFFFF' : (isDark ? '#A1A1A6' : '#6E6E73'),
          fontSize: '11.5px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s ease',
          outline: 'none',
          padding: 0
        }}
      >
        EN
      </button>
    </div>
  );
}
