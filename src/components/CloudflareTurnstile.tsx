'use client';

import React, { useEffect, useRef } from 'react';

interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

export default function CloudflareTurnstile({
  onVerify,
  onExpire,
  onError,
  className
}: CloudflareTurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if ((window as any).turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token),
            'expired-callback': () => onExpire && onExpire(),
            'error-callback': () => onError && onError(),
            theme: 'light',
            size: 'flexible'
          });
        } catch (e) {
          console.warn('Turnstile render error:', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if ((window as any).turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  if (!siteKey) return null;

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ minHeight: '65px', display: 'flex', justifyContent: 'center', margin: '12px 0' }} 
    />
  );
}
