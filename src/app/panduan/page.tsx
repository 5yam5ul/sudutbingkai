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
      {/* Unified Floating Glass Header with Official Logo & Mobile Menu */}
      <HeaderNav activePath="/panduan" />

      {/* Hero Section */}
      <main
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: 'clamp(32px, 5vw, 56px) clamp(16px, 3vw, 24px) 80px',
        }}
      >
        <div style={{ maxWidth: '760px', marginBottom: 'clamp(36px, 5vw, 52px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(194, 120, 3, 0.08)',
              border: '1px solid rgba(194, 120, 3, 0.2)',
              borderRadius: '999px',
              padding: '5px 14px',
              marginBottom: '16px',
            }}
          >
            <BookOpen size={13} color="#C27803" />
            <span
              style={{
                fontSize: '11.5px',
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
              fontSize: 'clamp(1.85rem, 5vw, 3.2rem)',
              fontWeight: 700,
              lineHeight: 1.18,
              color: '#1D1D1F',
              letterSpacing: '-0.02em',
              marginBottom: '14px',
            }}
          >
            Panduan Dokumentasi & Souvenir Pernikahan Modern
          </h1>
          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: '#515154',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Pelajari cara menghadirkan kamera sekali pakai digital di pernikahan Anda, tips menghemat anggaran photobooth, hingga ide suvenir interaktif yang berkesan seumur hidup.
          </p>
        </div>

        {/* Article Cards Grid with Visual Covers (Full Mobile Friendly) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(20px, 3vw, 32px)',
            marginBottom: '64px',
          }}
        >
          {guides.map((guide) => (
            <article
              key={guide.slug}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                padding: 'clamp(16px, 2.5vw, 20px)',
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
                    marginBottom: '16px',
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
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#C27803',
                      backgroundColor: 'rgba(194, 120, 3, 0.08)',
                      padding: '3px 10px',
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
                      fontSize: '11.5px',
                      color: '#86868B',
                    }}
                  >
                    <Clock size={12} />
                    <span>{guide.readingTime}</span>
                  </div>
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(17px, 2.2vw, 19px)',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    marginBottom: '8px',
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
                    fontSize: '13.5px',
                    color: '#515154',
                    lineHeight: 1.6,
                    marginBottom: '18px',
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
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#C27803',
                  textDecoration: 'none',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                Baca Selengkapnya
                <ChevronRight size={15} />
              </Link>
            </article>
          ))}
        </div>

        {/* Bottom CTA Box (Responsive on Mobile) */}
        <section
          style={{
            backgroundColor: '#12110F',
            borderRadius: '24px',
            padding: 'clamp(32px, 5vw, 48px) clamp(20px, 4vw, 40px)',
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
              fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#FFFFFF',
              lineHeight: 1.25,
            }}
          >
            Siap Mengabadikan Momen Terindah Bersama Tamu?
          </h2>
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              color: 'rgba(255, 255, 255, 0.72)',
              maxWidth: '600px',
              marginBottom: '24px',
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
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: '14.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Buat Acara Sekarang
            <ArrowRight size={15} />
          </Link>
        </section>
      </main>

      {/* Shared Luxury Enterprise Footer */}
      <Footer />
    </div>
  );
}
