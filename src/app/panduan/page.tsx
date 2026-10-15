import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { getAllGuides } from '@/lib/guides';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';

export default function PanduanHubPage() {
  const guides = getAllGuides();

  return (
    <div style={{ backgroundColor: '#FBFBFA', minHeight: '100vh', color: '#1D1D1F' }}>
      {/* Unified Header with Official Logo */}
      <HeaderNav activePath="/panduan" />

      {/* Hero Section */}
      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ maxWidth: '760px', marginBottom: '52px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.2)',
              borderRadius: '999px',
              padding: '6px 16px',
              marginBottom: '20px',
            }}
          >
            <BookOpen size={14} color="#C27803" />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#C27803',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Pusat Edukasi & Inspirasi
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: '#1D1D1F',
              letterSpacing: '-0.02em',
              marginBottom: '18px',
            }}
          >
            Panduan Dokumentasi & Souvenir Pernikahan Modern
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#515154',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Pelajari cara menghadirkan kamera sekali pakai digital di pernikahan Anda, tips menghemat anggaran photobooth, hingga ide suvenir interaktif yang berkesan seumur hidup.
          </p>
        </div>

        {/* Article Cards Grid with Visual Covers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            marginBottom: '72px',
          }}
        >
          {guides.map((guide) => (
            <article
              key={guide.slug}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                {/* 16:9 Editorial Cover Image */}
                <Link
                  href={`/panduan/${guide.slug}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    marginBottom: '18px',
                    backgroundColor: '#F4F4F1',
                    position: 'relative',
                  }}
                >
                  <img
                    src={guide.coverImage}
                    alt={guide.title}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </Link>

                {/* Category & Read Time */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#C27803',
                      backgroundColor: 'rgba(194, 120, 3, 0.08)',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {guide.category}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#86868B',
                    }}
                  >
                    <Clock size={13} />
                    <span>{guide.readingTime}</span>
                  </div>
                </div>

                <h2
                  style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    marginBottom: '10px',
                    color: '#1D1D1F',
                  }}
                >
                  <Link
                    href={`/panduan/${guide.slug}`}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    {guide.title}
                  </Link>
                </h2>

                <p
                  style={{
                    fontSize: '14px',
                    color: '#515154',
                    lineHeight: 1.6,
                    marginBottom: '20px',
                  }}
                >
                  {guide.excerpt}
                </p>
              </div>

              <Link
                href={`/panduan/${guide.slug}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#C27803',
                  textDecoration: 'none',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                Baca Selengkapnya
                <ChevronRight size={16} />
              </Link>
            </article>
          ))}
        </div>

        {/* Bottom CTA Box */}
        <section
          style={{
            backgroundColor: '#12110F',
            borderRadius: '24px',
            padding: '48px 40px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
              fontWeight: 700,
              marginBottom: '14px',
              color: '#FFFFFF',
            }}
          >
            Siap Mengabadikan Momen Terindah Bersama Tamu?
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.72)',
              maxWidth: '600px',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}
          >
            Buat album kamera sekali pakai digital untuk pernikahan Anda dalam 2 menit. Mulai dari paket Starter gratis hingga paket Wedding lengkap dengan live slideshow.
          </p>

          <Link
            href="/create"
            style={{
              backgroundColor: '#C27803',
              color: '#FFFFFF',
              padding: '14px 32px',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Buat Acara Sekarang
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      {/* Shared Luxury Enterprise Footer */}
      <Footer />
    </div>
  );
}
