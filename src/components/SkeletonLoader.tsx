'use client';

import React from 'react';
import { Camera } from 'lucide-react';

interface SkeletonLoaderProps {
  title?: string;
  subtitle?: string;
}

export default function SkeletonLoader({
  title = 'Memproses Rol Film...',
  subtitle = 'Menyiapkan album dan menyelaraskan jepretan kamera analog'
}: SkeletonLoaderProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFBFA', color: '#1D1D1F', position: 'relative', overflow: 'hidden' }}>
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(194, 120, 3, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 20px 80px', position: 'relative', zIndex: 1 }}>
        {/* Shutter Iris & Analog Aperture Animation Centerpiece */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0 48px', textAlign: 'center' }}>
          {/* Animated Aperture Shutter Circle */}
          <div className="aperture-shutter-container">
            <div className="aperture-iris-ring">
              {/* 8 Aperture Blades */}
              <div className="aperture-blade blade-1" />
              <div className="aperture-blade blade-2" />
              <div className="aperture-blade blade-3" />
              <div className="aperture-blade blade-4" />
              <div className="aperture-blade blade-5" />
              <div className="aperture-blade blade-6" />
              <div className="aperture-blade blade-7" />
              <div className="aperture-blade blade-8" />
            </div>

            {/* Center Shutter Glass & Icon */}
            <div className="aperture-lens-core">
              <Camera size={26} color="#C27803" className="aperture-camera-icon" />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <span className="font-mono-film" style={{ color: '#C27803', fontSize: '11px', display: 'inline-block', letterSpacing: '0.12em', marginBottom: '6px' }}>
              • ROLL DEVELOPING PROCESS •
            </span>
            <h2 className="font-display-serif" style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
              {title}
            </h2>
            <p style={{ color: '#86868B', fontSize: '13.5px', marginTop: '6px', maxWidth: '380px' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Shimmer Skeleton Wireframe for Event Header */}
        <div className="glass-card" style={{ borderRadius: '24px', padding: '24px 28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div className="skeleton-box" style={{ width: '120px', height: '14px', borderRadius: '6px', marginBottom: '12px' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '32px', borderRadius: '8px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="skeleton-box" style={{ width: '90px', height: '22px', borderRadius: '999px' }} />
                <div className="skeleton-box" style={{ width: '110px', height: '22px', borderRadius: '999px' }} />
                <div className="skeleton-box" style={{ width: '80px', height: '22px', borderRadius: '999px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton-box" style={{ width: '100px', height: '38px', borderRadius: '999px' }} />
              <div className="skeleton-box" style={{ width: '120px', height: '38px', borderRadius: '999px' }} />
            </div>
          </div>
        </div>

        {/* Shimmer Skeleton Gallery Grid (6 film cards) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                borderRadius: '20px',
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.7)',
                overflow: 'hidden'
              }}
            >
              {/* Photo Area with Film Frame Aspect Ratio */}
              <div
                className="skeleton-box"
                style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  borderRadius: '14px',
                  marginBottom: '14px',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    width: '60px',
                    height: '14px',
                    borderRadius: '4px',
                    background: 'rgba(0, 0, 0, 0.15)'
                  }}
                />
              </div>

              {/* Guest metadata line */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-box" style={{ width: '50%', height: '14px', borderRadius: '4px' }} />
                <div className="skeleton-box" style={{ width: '25%', height: '12px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
