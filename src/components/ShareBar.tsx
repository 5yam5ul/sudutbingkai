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
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\nBaca artikel selengkapnya di:\n${fullUrl}?utm_source=whatsapp&utm_medium=share_button`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(`${fullUrl}?utm_source=twitter&utm_medium=share_button`)}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
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
        {/* WhatsApp Share Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background-color 0.2s',
          }}
        >
          <MessageCircle size={14} />
          <span>WhatsApp</span>
        </a>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: copied ? 'rgba(194, 120, 3, 0.12)' : 'rgba(0, 0, 0, 0.04)',
            color: copied ? '#C27803' : '#515154',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={14} color="#C27803" /> : <Copy size={14} />}
          <span>{copied ? 'Tersalin!' : 'Salin Tautan'}</span>
        </button>

        {/* Twitter / X Share Button */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: '#1D1D1F',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <span>Share di X</span>
        </a>
      </div>
    </div>
  );
}
