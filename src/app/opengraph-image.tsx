import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SudutBingkai • Kamera Sekali Pakai untuk Pernikahan & Acara';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0F0E0D',
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(194, 120, 3, 0.35), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(194, 120, 3, 0.15), transparent)',
          padding: '60px 80px',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          border: '12px solid #1C1917',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Header Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '999px',
            padding: '8px 24px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#D97706',
            }}
          />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#F59E0B',
              textTransform: 'uppercase',
            }}
          >
            SudutBingkai • Kamera Tamu Sekali Pakai Digital
          </span>
        </div>

        {/* Center Headline & Value Proposition */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '1000px',
            marginTop: '20px',
            marginBottom: '20px',
          }}
        >
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 18px 0',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            Abadikan Momen Candid dari Sudut Pandang Tamu
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.72)',
              margin: 0,
              lineHeight: 1.45,
              maxWidth: '860px',
            }}
          >
            Tamu memotret langsung dengan scan QR code di meja. Tanpa instal aplikasi, bernuansa kamera analog retro dengan arsip resolusi cetak asli.
          </p>
        </div>

        {/* Bottom Feature Badges & URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <span
              style={{
                fontSize: '15px',
                color: '#D4D4D8',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              8 Filter Emulasi Film
            </span>
            <span
              style={{
                fontSize: '15px',
                color: '#D4D4D8',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Video & Pesan Suara 15s
            </span>
            <span
              style={{
                fontSize: '15px',
                color: '#D4D4D8',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '6px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Download Full High-Res (ZIP)
            </span>
          </div>

          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#F59E0B',
              letterSpacing: '0.04em',
            }}
          >
            sudutbingkai.id
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
