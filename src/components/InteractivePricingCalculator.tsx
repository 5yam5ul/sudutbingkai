'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Shield, Camera, QrCode, Zap, Film } from 'lucide-react';
import OdometerNumber from './OdometerNumber';
import { Language, DICTIONARY } from '@/lib/i18n';

interface InteractivePricingCalculatorProps {
  lang?: Language;
  initialGuests?: number;
}

interface TierStep {
  guests: number;
  label: string;
  tierId: string;
  name: string;
  idrPrice: number;
  idrOriginal: number;
  usdPrice: number;
  usdOriginal: number;
  shots: number;
  colorName: string;
  accentBg: string;
  badgeText: string;
  highlights: string[];
}

const TIER_STEPS: TierStep[] = [
  {
    guests: 5,
    label: '5',
    tierId: 'trial',
    name: 'Trial Demo',
    idrPrice: 0,
    idrOriginal: 0,
    usdPrice: 0,
    usdOriginal: 0,
    shots: 10,
    colorName: 'Vintage Alabaster',
    accentBg: '#E7E4DF',
    badgeText: 'GRATIS UJI COBA',
    highlights: ['5 tamu uji coba', '10 jepretan / tamu', 'Masa aktif 3 hari']
  },
  {
    guests: 15,
    label: '15',
    tierId: 'intimate',
    name: 'Intimate Dinner',
    idrPrice: 39000,
    idrOriginal: 49000,
    usdPrice: 3,
    usdOriginal: 4,
    shots: 15,
    colorName: 'Warm Nude Sand',
    accentBg: '#E5D6C5',
    badgeText: 'HEMAT 20%',
    highlights: ['Hingga 15 tamu', '15 jepretan / tamu', 'Download album ZIP', 'Aktif 7 hari']
  },
  {
    guests: 35,
    label: '35',
    tierId: 'small',
    name: 'Small Gathering',
    idrPrice: 89000,
    idrOriginal: 119000,
    usdPrice: 6,
    usdOriginal: 8,
    shots: 20,
    colorName: 'Honey Caramel',
    accentBg: '#E9C49A',
    badgeText: 'HEMAT 25%',
    highlights: ['Hingga 35 tamu', '20 jepretan / tamu', 'Video & Audio wish', 'Aktif 14 hari']
  },
  {
    guests: 75,
    label: '75',
    tierId: 'party',
    name: 'Party & Engagement',
    idrPrice: 179000,
    idrOriginal: 219000,
    usdPrice: 12,
    usdOriginal: 15,
    shots: 25,
    colorName: 'Vintage Rose Amber',
    accentBg: '#E5A58E',
    badgeText: 'FAVORIT GATHERING',
    highlights: ['Hingga 75 tamu', '25 jepretan / tamu', 'Live Projection Screen', 'Aktif 30 hari']
  },
  {
    guests: 150,
    label: '150',
    tierId: 'event',
    name: 'Grand Event',
    idrPrice: 269000,
    idrOriginal: 329000,
    usdPrice: 18,
    usdOriginal: 22,
    shots: 30,
    colorName: 'Sage Olive Bloom',
    accentBg: '#BFD0B8',
    badgeText: 'HEMAT 18%',
    highlights: ['Hingga 150 tamu', '30 jepretan / tamu', 'Full Live Screen + Confetti', 'Aktif 30 hari']
  },
  {
    guests: 300,
    label: '300',
    tierId: 'wedding',
    name: 'Royal Wedding',
    idrPrice: 499000,
    idrOriginal: 599000,
    usdPrice: 32,
    usdOriginal: 39,
    shots: 36,
    colorName: 'Classic Terracotta',
    accentBg: '#DDA07C',
    badgeText: 'PALING POPULER',
    highlights: ['Hingga 300 tamu', '36 jepretan / tamu', 'Kustom Logo & Bingkai', 'Aktif 30 hari']
  },
  {
    guests: 1000,
    label: '∞',
    tierId: 'unlimited',
    name: 'Unlimited Horizon',
    idrPrice: 999000,
    idrOriginal: 1199000,
    usdPrice: 65,
    usdOriginal: 78,
    shots: 99,
    colorName: 'Obsidian Gold Luxe',
    accentBg: '#1C1917',
    badgeText: 'VIP UNLIMITED',
    highlights: ['Tamu tanpa batas', '99 jepretan / tamu', 'Prioritas Cloud & SLA', 'Aktif 30 hari']
  }
];

export default function InteractivePricingCalculator({
  lang = 'id'
}: InteractivePricingCalculatorProps) {
  const [sliderIndex, setSliderIndex] = useState<number>(4); // default 150 guests
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');

  const currentTier = TIER_STEPS[sliderIndex];
  const isEn = lang === 'en';
  const t = DICTIONARY[lang].pricing;

  // Calculate per guest cost
  const isFree = currentTier.idrPrice === 0;
  const isUnlimited = currentTier.guests >= 1000;

  const perGuestIDR = !isFree && !isUnlimited
    ? Math.round(currentTier.idrPrice / currentTier.guests)
    : 0;

  const perGuestUSD = !isFree && !isUnlimited
    ? (currentTier.usdPrice / currentTier.guests).toFixed(2)
    : '0';

  const formatIDR = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  return (
    <section id="kalkulator-harga" className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/15 bg-amber-50/80 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-amber-900 shadow-sm backdrop-blur">
          <Film className="h-3 w-3 text-amber-700" />
          {t.badge}
        </span>
        <h2 className="mt-4 text-balance font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
          {t.headline}
        </h2>
        <p className="mt-3 text-pretty font-sans text-base text-stone-600 sm:text-lg">
          {isEn
            ? 'Drag the guest slider below to calculate total shots and cost per guest.'
            : 'Geser jumlah tamu di bawah untuk melihat jatah jepretan & biaya transparan per tamu.'}
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* Left: Tactile Retro Camera Body Visual */}
        <div className="flex flex-col items-center">
          <div
            className="relative w-full max-w-[480px] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              backgroundColor: currentTier.accentBg,
              color: currentTier.tierId === 'unlimited' ? '#FBF9F5' : '#2A2521',
              boxShadow: '0 24px 60px -20px rgba(42, 37, 33, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Camera Hardware Details */}
            <div className="flex items-center justify-between">
              {/* Brand Logo & Model */}
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-amber-400 font-serif font-black text-sm shadow">
                  SB
                </span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">
                    SUDUT BINGKAI DISPO
                  </p>
                  <p className="font-serif font-bold text-xs tracking-tight">
                    {currentTier.name}
                  </p>
                </div>
              </div>

              {/* Viewfinder Window & Flash Bulb */}
              <div className="flex items-center gap-2.5">
                {/* Flash Window */}
                <div className="h-6 w-9 rounded-md border border-stone-800/20 bg-gradient-to-br from-amber-100/90 to-amber-200/50 p-1 shadow-inner flex items-center justify-center">
                  <div className="h-2.5 w-4 rounded-sm bg-amber-400/80 shadow-[0_0_8px_#F59E0B]" />
                </div>
                {/* Optical Viewfinder */}
                <div className="h-7 w-7 rounded-lg border-2 border-stone-900 bg-stone-900/90 p-1 flex items-center justify-center shadow-inner">
                  <div className="h-2 w-2 rounded-sm border border-stone-400/60" />
                </div>
              </div>
            </div>

            {/* Center: Big Retro Lens Circle */}
            <div className="relative mx-auto my-6 flex aspect-square w-48 sm:w-56 items-center justify-center rounded-full border-4 border-stone-900/15 bg-gradient-to-b from-stone-900 to-stone-950 p-3 shadow-2xl">
              {/* Outer Lens Ring */}
              <div className="relative flex h-full w-full items-center justify-center rounded-full border border-stone-700 bg-stone-900 p-4 text-center">
                {/* Lens Glass Elements Reflections */}
                <div className="absolute inset-2 rounded-full border border-stone-700/50 bg-gradient-to-tr from-stone-950 via-stone-900 to-amber-950/40" />
                
                {/* Inner Content on Lens Glass */}
                <div className="relative z-10 flex flex-col items-center justify-center text-amber-100">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-300/80">
                    {isEn ? 'GUEST CAPACITY' : 'KAPASITAS TAMU'}
                  </p>
                  <div className="mt-1 font-serif text-4xl sm:text-5xl font-black text-amber-50">
                    {currentTier.label}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {isUnlimited ? (isEn ? 'Unlimited Guests' : 'Tamu Tanpa Batas') : (isEn ? 'Guests' : 'Tamu')}
                  </p>
                </div>

                {/* Subtle Lens Glare */}
                <div className="pointer-events-none absolute left-6 top-6 h-12 w-12 rounded-full bg-white/10 blur-[6px]" />
              </div>
            </div>

            {/* Bottom Hardware Strip: Winding Gear & Mechanical Counter */}
            <div className="flex items-center justify-between rounded-2xl bg-stone-950/15 p-3.5 backdrop-blur-sm">
              {/* Odometer Shot Counter */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 items-center rounded-xl border border-stone-900/30 bg-stone-950 px-3 text-amber-400 shadow-inner">
                  <OdometerNumber
                    value={currentTier.shots}
                    className="text-2xl text-amber-400 font-mono"
                  />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {isEn ? 'Shots per Guest' : 'Jepretan / Tamu'}
                  </p>
                  <p className="text-[11px] font-medium opacity-90">
                    {isEn ? 'Pure Analog Experience' : 'Sensasi Disposable Roll'}
                  </p>
                </div>
              </div>

              {/* Physical Winding Wheel Mockup */}
              <div className="flex flex-col items-center">
                <div className="h-8 w-11 rounded-md border border-stone-900/40 bg-stone-900 shadow-inner flex items-center justify-around px-1">
                  <span className="h-5 w-0.5 bg-stone-700 rounded-full" />
                  <span className="h-5 w-0.5 bg-stone-700 rounded-full" />
                  <span className="h-5 w-0.5 bg-stone-700 rounded-full" />
                  <span className="h-5 w-0.5 bg-stone-700 rounded-full" />
                </div>
                <span className="mt-1 font-mono text-[8px] uppercase tracking-widest opacity-60">
                  WIND
                </span>
              </div>
            </div>
          </div>

          {/* Color Scheme Tag */}
          <p className="mt-3 font-mono text-[11px] text-stone-500">
            {isEn ? 'Analog Chassis Color:' : 'Warna Bodi Kamera:'}{' '}
            <strong className="text-stone-800">{currentTier.colorName}</strong>
          </p>
        </div>

        {/* Right: Controls & Pricing Card */}
        <div className="flex flex-col rounded-3xl border border-stone-200/80 bg-white/90 p-6 sm:p-8 shadow-[0_20px_50px_-30px_rgba(42,37,33,0.2)] backdrop-blur-md">
          {/* Header Row: Tier Badge & Currency Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="h-3 w-3" />
              {currentTier.badgeText}
            </span>

            {/* Currency Pill Switcher */}
            <div
              role="group"
              aria-label="Currency"
              className="relative inline-grid grid-cols-2 items-center rounded-full border border-stone-200 bg-stone-100 p-0.5 font-mono text-xs font-bold select-none"
              style={{ width: '104px', height: '32px' }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: 'calc(50% - 2px)',
                  left: '2px',
                  transform: currency === 'USD' ? 'translateX(100%)' : 'translateX(0%)'
                }}
              />
              <button
                type="button"
                onClick={() => setCurrency('IDR')}
                aria-pressed={currency === 'IDR'}
                className={`relative z-10 flex h-full items-center justify-center rounded-full transition-colors ${
                  currency === 'IDR' ? 'text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                IDR
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                aria-pressed={currency === 'USD'}
                className={`relative z-10 flex h-full items-center justify-center rounded-full transition-colors ${
                  currency === 'USD' ? 'text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Interactive Guest Range Slider */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-500">
              <span>{isEn ? 'SELECT GUESTS:' : 'PILIH JUMLAH TAMU:'}</span>
              <span className="text-stone-900 font-serif text-sm">
                {currentTier.label} {isUnlimited ? '' : (isEn ? 'Guests' : 'Tamu')}
              </span>
            </div>

            {/* Custom Styled Slider */}
            <div className="relative mt-3">
              <input
                type="range"
                min={0}
                max={TIER_STEPS.length - 1}
                step={1}
                value={sliderIndex}
                onChange={(e) => setSliderIndex(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />

              {/* Step Notch Markers */}
              <div className="mt-2 flex justify-between px-0.5">
                {TIER_STEPS.map((step, idx) => (
                  <button
                    key={step.tierId}
                    type="button"
                    onClick={() => setSliderIndex(idx)}
                    className={`font-mono text-[11px] font-bold transition-all ${
                      idx === sliderIndex
                        ? 'scale-110 text-amber-700 underline decoration-amber-500 decoration-2 underline-offset-4'
                        : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price Calculation Display with Odometer */}
          <div className="mt-8 border-t border-stone-100 pt-6">
            {/* Original Strikethrough Price if discounted */}
            {!isFree && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-400">
                <span>{isEn ? 'Normal Price:' : 'Harga Normal:'}</span>
                <s className="decoration-rose-500 decoration-2">
                  {currency === 'IDR'
                    ? `Rp ${formatIDR(currentTier.idrOriginal)}`
                    : `$${currentTier.usdOriginal}`}
                </s>
              </div>
            )}

            {/* Main Price Headline */}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-4xl sm:text-5xl font-black tracking-tight text-stone-950">
                {isFree ? (
                  <span>{isEn ? 'FREE' : 'GRATIS'}</span>
                ) : currency === 'IDR' ? (
                  <span className="flex items-baseline">
                    <span className="text-2xl font-serif mr-1">Rp</span>
                    <OdometerNumber
                      value={formatIDR(currentTier.idrPrice)}
                      className="text-4xl sm:text-5xl"
                    />
                  </span>
                ) : (
                  <span className="flex items-baseline">
                    <span className="text-3xl font-serif mr-1">$</span>
                    <OdometerNumber
                      value={currentTier.usdPrice}
                      className="text-4xl sm:text-5xl"
                    />
                  </span>
                )}
              </span>
            </div>

            {/* Per Guest Micro Price (Psychological Price Anchoring) */}
            {!isFree && !isUnlimited && (
              <p className="mt-1.5 font-sans text-sm font-semibold text-amber-800">
                {isEn ? (
                  <>
                    Only <span className="font-mono text-base font-bold text-stone-900">${perGuestUSD}</span> {t.perGuestLabel}
                  </>
                ) : (
                  <>
                    Hanya <span className="font-mono text-base font-bold text-stone-900">Rp {formatIDR(perGuestIDR)}</span> {t.perGuestLabel}
                  </>
                )}
              </p>
            )}

            {isUnlimited && (
              <p className="mt-1.5 font-sans text-sm font-semibold text-emerald-800">
                {isEn ? 'Unlimited Guest Access' : 'Bebas Akses Tamu Tanpa Batas'}
              </p>
            )}
          </div>

          {/* Highlights Checklist */}
          <ul className="mt-6 space-y-2.5 border-t border-stone-100 pt-6">
            {currentTier.highlights.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Call to Action Button */}
          <div className="mt-8 flex flex-col gap-2">
            <Link
              href={
                isFree
                  ? '/cam/demo'
                  : `/create?tier=${currentTier.tierId}&guests=${currentTier.guests}&currency=${currency}`
              }
              className="press flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3.5 text-sm font-bold uppercase tracking-wider text-amber-300 transition-all hover:bg-stone-850 hover:shadow-lg active:scale-[0.98]"
            >
              <span>{isFree ? t.freeTestBtn : t.createEventBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Currency Settlement Guarantee Note */}
            <p className="text-center font-sans text-[11px] text-stone-500">
              <Shield className="mr-1 inline h-3 w-3 text-emerald-700" />
              {t.currencyNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
