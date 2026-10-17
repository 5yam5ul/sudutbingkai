/**
 * Pure, dependency-free media URL helpers (safe to import in client components).
 *
 * WHY: The default Cloudflare R2 public domain (*.r2.dev) is blocked by the
 * Indonesian "Internet Positif" DNS filter on many carriers (Telkomsel, IndiHome,
 * XL, Indosat, etc.). Requests are redirected to internet-positif.info, so the
 * <img> fails and the photo tile shows only its black background.
 * Routing media through our own domain (/api/storage/...) avoids that block.
 */
export function formatSafeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('.r2.dev/')) {
    try {
      const parsed = new URL(trimmed);
      return `/api/storage${parsed.pathname}`;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}
