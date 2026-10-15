import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, User, ArrowRight, CheckCircle2, Camera } from 'lucide-react';
import { getGuideBySlug } from '@/lib/guides';

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return (
    <div style={{ backgroundColor: '#FBFBFA', minHeight: '100vh', color: '#1D1D1F' }}>
      {/* Header Bar */}
      <header
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/panduan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#515154',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Panduan</span>
          </Link>

          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#12110F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C27803',
              }}
            >
              <Camera size={15} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '18px',
                fontWeight: 700,
                color: '#1D1D1F',
              }}
            >
              SudutBingkai
            </span>
          </Link>

          <Link
            href="/create"
            style={{
              fontSize: '13px',
              backgroundColor: '#1D1D1F',
              color: '#FFFFFF',
              padding: '8px 18px',
              borderRadius: '999px',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Buat Acara
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Article Container */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Breadcrumb Visual Trail */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#86868B',
            marginBottom: '24px',
          }}
        >
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Beranda
          </Link>
          <span>/</span>
          <Link href="/panduan" style={{ color: 'inherit', textDecoration: 'none' }}>
            Panduan
          </Link>
          <span>/</span>
          <span style={{ color: '#C27803', fontWeight: 600 }}>{guide.category}</span>
        </nav>

        {/* Article Meta Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#86868B',
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(194, 120, 3, 0.1)',
              color: '#C27803',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '11px',
            }}
          >
            {guide.category}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={14} />
            <span>{guide.publishedAt}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} />
            <span>{guide.readingTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <User size={14} />
            <span>{guide.author.name}</span>
          </div>
        </div>

        {/* Article H1 Title */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#1D1D1F',
            letterSpacing: '-0.02em',
            marginBottom: '28px',
          }}
        >
          {guide.title}
        </h1>

        {/* Intro Highlight Box */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '4px solid #C27803',
            borderRadius: '0 16px 16px 0',
            padding: '24px 28px',
            fontSize: '17px',
            lineHeight: 1.7,
            color: '#3A3A3C',
            marginBottom: '44px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          {guide.content.intro}
        </div>

        {/* Article Body Content */}
        <article style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {guide.content.sections.map((section, idx) => (
            <section key={idx}>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1D1D1F',
                  marginBottom: '16px',
                  lineHeight: 1.3,
                }}
              >
                {section.heading}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    style={{
                      fontSize: '16px',
                      color: '#48484A',
                      lineHeight: 1.75,
                      margin: 0,
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>

              {section.keyTakeaways && (
                <div
                  style={{
                    marginTop: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    padding: '20px 24px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#C27803',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '12px',
                    }}
                  >
                    Poin Utama:
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {section.keyTakeaways.map((takeaway, tIdx) => (
                      <li
                        key={tIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          fontSize: '15px',
                          color: '#1D1D1F',
                          lineHeight: 1.5,
                        }}
                      >
                        <CheckCircle2 size={18} color="#C27803" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {/* Conclusion */}
          <section
            style={{
              paddingTop: '20px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1D1D1F',
                marginBottom: '12px',
              }}
            >
              Kesimpulan
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#48484A',
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {guide.content.conclusion}
            </p>
          </section>
        </article>

        {/* Embedded Call-to-Action Box */}
        <div
          style={{
            marginTop: '56px',
            backgroundColor: '#12110F',
            borderRadius: '24px',
            padding: '40px 32px',
            color: '#FFFFFF',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#FFFFFF',
            }}
          >
            Ingin Mencoba Kamera Tamu Digital di Acara Anda?
          </h3>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.72)',
              maxWidth: '560px',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}
          >
            Coba Paket Starter gratis tanpa biaya untuk 5 tamu pertama, atau langsung pilih Paket Wedding untuk 300 tamu dengan filter film analog lengkap.
          </p>

          <Link
            href="/create"
            style={{
              backgroundColor: '#C27803',
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Buat Acara Sekarang
            <ArrowRight size={15} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#86868B',
        }}
      >
        <p>© 2026 SudutBingkai. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}
