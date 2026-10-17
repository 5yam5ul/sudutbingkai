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

  const containerStyles = {
    light: 'bg-stone-100 border border-stone-200 text-stone-800',
    dark: 'bg-stone-900/80 border border-stone-800 text-stone-200 backdrop-blur-md',
    glass: 'bg-white/30 border border-white/40 text-stone-900 backdrop-blur-lg shadow-sm'
  }[variant];

  const activePillBg = {
    light: 'bg-stone-900 text-white',
    dark: 'bg-amber-500 text-stone-950 font-bold',
    glass: 'bg-stone-900 text-white'
  }[variant];

  const inactiveText = {
    light: 'text-stone-500 hover:text-stone-900',
    dark: 'text-stone-400 hover:text-stone-100',
    glass: 'text-stone-600 hover:text-stone-950'
  }[variant];

  return (
    <div
      role="group"
      aria-label="Language Selection"
      className={`relative inline-grid grid-cols-2 items-center rounded-full p-0.5 text-[11px] font-mono font-bold tracking-wider select-none ${containerStyles} ${className}`}
      style={{ width: '84px', height: '28px' }}
    >
      {/* Sliding Active Pill Background */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activePillBg}`}
        style={{
          width: 'calc(50% - 2px)',
          left: '2px',
          transform: isEn ? 'translateX(100%)' : 'translateX(0%)'
        }}
      />

      {/* ID Button */}
      <button
        type="button"
        onClick={() => onLanguageChange('id')}
        aria-pressed={!isEn}
        className={`relative z-10 flex h-full items-center justify-center rounded-full transition-colors duration-200 ${
          !isEn ? 'text-inherit' : inactiveText
        }`}
      >
        ID
      </button>

      {/* EN Button */}
      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        aria-pressed={isEn}
        className={`relative z-10 flex h-full items-center justify-center rounded-full transition-colors duration-200 ${
          isEn ? 'text-inherit' : inactiveText
        }`}
      >
        EN
      </button>
    </div>
  );
}
