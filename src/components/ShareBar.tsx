'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShareBarProps {
  title: string;
  url: string;
}

export default function ShareBar({ title, url }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `https://sudutbingkai.vercel.app${url}`;
  
  // Share URLs with trackable UTM tags
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\nBaca artikel selengkapnya di:\n${fullUrl}?utm_source=whatsapp&utm_medium=share_button`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${fullUrl}?utm_source=facebook&utm_medium=share_button`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(`${fullUrl}?utm_source=twitter&utm_medium=share_button`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(`${fullUrl}?utm_source=telegram&utm_medium=share_button`)}&text=${encodeURIComponent(title)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${fullUrl}?utm_source=linkedin&utm_medium=share_button`)}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`${fullUrl}?utm_source=pinterest&utm_medium=share_button`)}&description=${encodeURIComponent(title)}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Tautan artikel berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - Baca artikel selengkapnya di SudutBingkai:`,
          url: fullUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const buttonBaseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 13px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.18s ease',
    cursor: 'pointer',
    userSelect: 'none',
    border: '1px solid transparent',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 18px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1D1D1F', marginRight: '4px' }}>
        <Share2 size={15} color="#C27803" />
        <span>Bagikan Artikel:</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke WhatsApp"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            borderColor: 'rgba(16, 185, 129, 0.25)',
          }}
        >
          <MessageCircle size={14} />
          <span>WhatsApp</span>
        </a>

        {/* Facebook */}
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke Facebook"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(24, 119, 242, 0.08)',
            color: '#1877F2',
            borderColor: 'rgba(24, 119, 242, 0.22)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </a>

        {/* Telegram */}
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke Telegram"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(0, 136, 204, 0.08)',
            color: '#0088CC',
            borderColor: 'rgba(0, 136, 204, 0.22)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.965z" />
          </svg>
          <span>Telegram</span>
        </a>

        {/* X / Twitter */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke X (Twitter)"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: '#1D1D1F',
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X</span>
        </a>

        {/* LinkedIn */}
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Bagikan ke LinkedIn"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(10, 102, 194, 0.08)',
            color: '#0A66C2',
            borderColor: 'rgba(10, 102, 194, 0.22)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          <span>LinkedIn</span>
        </a>

        {/* Pinterest */}
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Simpan ke Pinterest"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(230, 0, 35, 0.08)',
            color: '#E60023',
            borderColor: 'rgba(230, 0, 35, 0.22)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
          </svg>
          <span>Pinterest</span>
        </a>

        {/* Salin Tautan */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="Salin Tautan Artikel"
          style={{
            ...buttonBaseStyle,
            backgroundColor: copied ? 'rgba(194, 120, 3, 0.12)' : 'rgba(0, 0, 0, 0.04)',
            color: copied ? '#C27803' : '#515154',
            borderColor: copied ? 'rgba(194, 120, 3, 0.25)' : 'rgba(0, 0, 0, 0.08)',
          }}
        >
          {copied ? <Check size={13} color="#C27803" /> : <Copy size={13} />}
          <span>{copied ? 'Tersalin!' : 'Salin Tautan'}</span>
        </button>

        {/* Lainnya / Instagram Stories / Native Share */}
        <button
          type="button"
          onClick={handleNativeShare}
          title="Bagikan ke Instagram Stories, Feed, TikTok, atau aplikasi lainnya"
          style={{
            ...buttonBaseStyle,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: '#1D1D1F',
            borderColor: 'rgba(0, 0, 0, 0.08)',
          }}
        >
          <Share2 size={13} />
          <span>Lainnya</span>
        </button>
      </div>
    </div>
  );
}
