import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, User, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { getGuideBySlug } from '@/lib/guides';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';
import ShareBar from '@/components/ShareBar';

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

  const articlePath = `/panduan/${guide.slug}`;

  return (
    <div style={{ backgroundColor: '#FBFBFA', minHeight: '100vh', color: '#1D1D1F' }}>
      {/* Unified Floating Glass Header with Official Logo & Mobile Menu */}
      <HeaderNav activePath="/panduan" />

      {/* Article Container */}
      <main
        style={{
          maxWidth: '840px',
          margin: '0 auto',
          padding: 'clamp(24px, 4vw, 44px) clamp(16px, 3vw, 24px) 80px',
        }}
      >
        {/* Back Link & Breadcrumb Visual Trail */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <Link
            href="/panduan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#C27803',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Semua Panduan</span>
          </Link>

          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#86868B',
              flexWrap: 'wrap',
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
            <span style={{ color: '#1D1D1F', fontWeight: 600 }}>{guide.category}</span>
          </nav>
        </div>

        {/* Article Meta Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            fontSize: '12.5px',
            color: '#86868B',
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(194, 120, 3, 0.1)',
              color: '#C27803',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '10.5px',
            }}
          >
            {guide.category}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} />
            <span>{guide.publishedAt}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} />
            <span>{guide.readingTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={13} />
            <span>{guide.author.name}</span>
          </div>
        </div>

        {/* Article H1 Title */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.75rem, 4.5vw, 2.85rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#1D1D1F',
            letterSpacing: '-0.02em',
            marginBottom: '20px',
          }}
        >
          {guide.title}
        </h1>

        {/* Editorial Dek / Lead Paragraph (Natural Featured Snippet for Google & AI Search) */}
        <p
          style={{
            fontSize: 'clamp(16.5px, 2.2vw, 19.5px)',
            color: '#48484A',
            lineHeight: 1.6,
            fontWeight: 450,
            marginBottom: '28px',
            letterSpacing: '-0.01em',
          }}
        >
          {guide.tldr}
        </p>

        {/* Prominent High-Resolution Cover Image with Rich Alt (Jurus 4: Image SEO) */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 'clamp(14px, 2vw, 20px)',
            overflow: 'hidden',
            marginBottom: '20px',
            backgroundColor: '#F4F4F1',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <img
            src={guide.coverImage}
            alt={guide.coverAlt}
            loading="eager"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Intro Highlight Box */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '4px solid #C27803',
            borderRadius: '0 14px 14px 0',
            padding: 'clamp(16px, 2.5vw, 24px) clamp(16px, 2.5vw, 26px)',
            fontSize: 'clamp(15px, 2vw, 16.5px)',
            lineHeight: 1.7,
            color: '#3A3A3C',
            marginBottom: '36px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          {guide.content.intro}
        </div>

        {/* Article Body Content */}
        <article style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {guide.content.sections.map((section, idx) => (
            <section key={idx}>
              <h2
                style={{
                  fontSize: 'clamp(19px, 2.5vw, 23px)',
                  fontWeight: 700,
                  color: '#1D1D1F',
                  marginBottom: '14px',
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
                      fontSize: '15px',
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
                    marginTop: '18px',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    padding: 'clamp(16px, 2vw, 20px) clamp(16px, 2vw, 22px)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#C27803',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
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
                          fontSize: '14px',
                          color: '#1D1D1F',
                          lineHeight: 1.5,
                        }}
                      >
                        <CheckCircle2 size={16} color="#C27803" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {/* Micro-FAQ Section for Google Featured Snippets */}
          {guide.faqMicro && guide.faqMicro.length > 0 && (
            <section
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                padding: 'clamp(20px, 3vw, 28px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <HelpCircle size={18} color="#C27803" />
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1D1D1F',
                    margin: 0,
                  }}
                >
                  Tanya Jawab Singkat (FAQ)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {guide.faqMicro.map((faq, fIdx) => (
                  <div
                    key={fIdx}
                    style={{
                      borderBottom: fIdx !== guide.faqMicro.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                      paddingBottom: fIdx !== guide.faqMicro.length - 1 ? '14px' : '0',
                    }}
                  >
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1F', marginBottom: '6px' }}>
                      {faq.question}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#515154', lineHeight: 1.6, margin: 0 }}>
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Conclusion */}
          <section
            style={{
              paddingTop: '18px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1D1D1F',
                marginBottom: '10px',
              }}
            >
              Kesimpulan
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#48484A',
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {guide.content.conclusion}
            </p>
          </section>
        </article>

        {/* Bottom Social Share Bar (Jurus 7) */}
        <div style={{ marginTop: '36px' }}>
          <ShareBar title={guide.title} url={articlePath} />
        </div>

        {/* Embedded Call-to-Action Box */}
        <div
          style={{
            marginTop: '44px',
            backgroundColor: '#12110F',
            borderRadius: '24px',
            padding: 'clamp(32px, 4vw, 40px) clamp(20px, 4vw, 32px)',
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
              fontSize: 'clamp(20px, 2.5vw, 24px)',
              fontWeight: 700,
              marginBottom: '10px',
              color: '#FFFFFF',
            }}
          >
            Ingin Mencoba Kamera Tamu Digital di Acara Anda?
          </h3>
          <p
            style={{
              fontSize: '14.5px',
              color: 'rgba(255, 255, 255, 0.72)',
              maxWidth: '560px',
              marginBottom: '22px',
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

      {/* Shared Luxury Enterprise Footer */}
      <Footer />
    </div>
  );
}
