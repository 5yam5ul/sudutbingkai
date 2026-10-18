/**
 * Pure, dependency-free media URL helpers (safe to import in client components).
 *
 * WHY: The default Cloudflare R2 public domain (*.r2.dev) is blocked by the
 * Indonesian "Internet Positif" DNS filter on many carriers (Telkomsel, IndiHome,
 * XL, Indosat, etc.). Requests are redirected to internet-positif.info, so the
 * <img> fails and the photo tile shows only its black background.
 * Routing media through our own domain (/api/storage/...) avoids that block.
 */
const CUSTOM_MEDIA_DOMAIN = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://media.sudutbingkai.id').replace(/\/+$/, '');

export function formatSafeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Local Base64 or Blob URLs (active in-memory captures)
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Cloudflare default *.r2.dev domains are blocked by Indonesian ISP DNS (TrustPositif)
  // Rewrite them dynamically to our official, unblocked custom domain (media.sudutbingkai.id)
  if (trimmed.includes('.r2.dev/')) {
    try {
      const parsed = new URL(trimmed);
      return `${CUSTOM_MEDIA_DOMAIN}${parsed.pathname}`;
    } catch {
      return trimmed.replace(/^https?:\/\/[^/]+\.r2\.dev/, CUSTOM_MEDIA_DOMAIN);
    }
  }

  return trimmed;
}
