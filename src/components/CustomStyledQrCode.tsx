'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import { Download, RefreshCw } from 'lucide-react';

interface CustomStyledQrCodeProps {
  url: string;
  size?: number;
  dotType?: DotType;
  cornerType?: CornerSquareType;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  showDownloadButtons?: boolean;
}

export default function CustomStyledQrCode({
  url,
  size = 260,
  dotType = 'rounded',
  cornerType = 'extra-rounded',
  primaryColor = '#1D1D1F',
  accentColor = '#C27803',
  logoUrl,
  showDownloadButtons = false
}: CustomStyledQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    const qr = new QRCodeStyling({
      width: size,
      height: size,
      data: url,
      image: logoUrl,
      dotsOptions: {
        color: primaryColor,
        type: dotType
      },
      cornersSquareOptions: {
        color: accentColor,
        type: cornerType
      },
      cornersDotOptions: {
        color: accentColor,
        type: 'dot'
      },
      backgroundOptions: {
        color: '#FFFFFF'
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 6,
        imageSize: 0.28
      }
    });

    qrCodeRef.current = qr;
    containerRef.current.innerHTML = '';
    qr.append(containerRef.current);
    setIsRendered(true);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      qrCodeRef.current = null;
    };
  }, [url, size, dotType, cornerType, primaryColor, accentColor, logoUrl]);

  const handleDownload = (format: 'png' | 'svg') => {
    if (!qrCodeRef.current) return;
    qrCodeRef.current.download({
      name: `qr-sudutbingkai-${Date.now()}`,
      extension: format
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        ref={containerRef} 
        className="rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-2.5 bg-white border border-black/5"
      />

      {showDownloadButtons && isRendered && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownload('png')}
            className="glass-pill px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 text-[#1D1D1F] hover:bg-black/5 cursor-pointer"
          >
            <Download size={13} />
            <span>Download PNG HD</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload('svg')}
            className="glass-pill px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 text-[#C27803] hover:bg-black/5 cursor-pointer"
          >
            <Download size={13} />
            <span>SVG Vektor</span>
          </button>
        </div>
      )}
    </div>
  );
}
