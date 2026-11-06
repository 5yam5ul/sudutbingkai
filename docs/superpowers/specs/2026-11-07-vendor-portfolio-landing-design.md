# Vendor Exclusive Portfolio Landing Page & Google Drive Integration Design

## Intent and Why
Photography vendors on SudutBingkai need a high-converting, professional, and branded public portfolio landing page at `sudutbingkai.id/[vendorSlug]` to share with potential clients via Instagram bio, WhatsApp, or business proposals. Instead of uploading gigabytes of high-resolution wedding/event photos directly to our servers (which increases infrastructure costs and management friction), vendors can simply link their Google Drive folders. The system fetches and renders photos on-the-fly with 0 byte storage cost on our servers, complete with an elegant, responsive flipbook/slideshow modal viewer.

## Goals
1. **Public Branded Landing Page:** Clean URL `sudutbingkai.id/[vendorSlug]` featuring the vendor's social-style cover banner, logo, verified badge, bio, location, Instagram, and direct "Chat via WhatsApp" button.
2. **Category / Album Cards:** Vendors organize their work into named categories (e.g., Wedding, Prewedding, Siraman) displayed as visual thumbnail cards rather than plain file directories.
3. **Google Drive Zero-Storage Integration:** Album photos are sourced via the existing `/api/proofing/drive` endpoint directly from the vendor's public Google Drive folder (`https://drive.google.com/drive/folders/...`).
4. **Custom Cover Freedom (Option 2):** Vendors can choose any photo from that Google Drive folder as the album cover, or upload/paste a custom cover image URL.
5. **Interactive Slideshow / Photobook Experience:** Clicking an album card opens a fullscreen modal with an elegant book-like flip transition, touch swipe, keyboard navigation, and responsive high-res image previews.
6. **Dashboard Management:** An intuitive "Portofolio" tab in the `/vendor` dashboard for managing bio, cover banner, slug, WhatsApp number, and creating/editing/deleting portfolio albums.

## Non-Goals & Anti-Goals
- **Non-Goals:** Building a heavy full-blown website builder (like Wix or Squarespace); managing custom domains beyond `sudutbingkai.id/[vendorSlug]`.
- **Anti-Goals:** Uploading entire client photo archives to SudutBingkai R2/S3 storage for portfolios (violates the zero-cost storage principle); requiring complex Google Cloud OAuth permissions for vendors (standard "Anyone with the link can view" sharing is sufficient).

## Constraints
- Must use existing `/api/proofing/drive` logic which leverages `GOOGLE_DRIVE_API_KEY` and in-memory LRU caching.
- Must support fallback when Supabase is unreachable or when vendor data is stored locally in `data/vendors.json`.
- Must be mobile-first responsive and ultra-fast.
- URL slug collision prevention: reserved routes (`admin`, `vendor`, `login`, `create`, `api`, `proof`, `dashboard`, `panduan`, `cam`, `event`, `invoice`) cannot be used as vendor slugs.

## Approaches Considered
- **Option 1: Pure Google Drive Link (Automatic Only)**
  * Fast to setup, automatically takes the 1st photo as cover.
  * *Downside:* Vendor cannot set a dedicated aesthetic portrait or landscape cover image.
- **Option 2: Google Drive + Custom Cover Option (Chosen)**
  * Photos inside the album come 100% from Google Drive.
  * Vendor has the flexibility to either pick a photo from the Google Drive folder or upload a specific cover thumbnail.
  * Provides maximum aesthetic freedom for the photographer's brand.

## Architecture & Data Model
### Data Structure (`VendorPortfolioAlbum`)
```typescript
export interface VendorPortfolioAlbum {
  id: string;
  title: string;
  description?: string;
  driveFolderUrl: string;
  coverImageUrl: string;
  photoCount?: number;
  order: number;
  createdAt: string;
}

export interface VendorPortfolioProfile {
  slug: string;
  bio?: string;
  coverUrl?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  albums: VendorPortfolioAlbum[];
}
```

### Routing & Endpoints
1. `GET /api/vendors/portfolio?slug=[slug]&vendorId=[id]`: Fetch public or private portfolio data.
2. `PUT /api/vendors/portfolio`: Vendor updates bio, cover banner, slug, and albums (authenticated session).
3. `src/app/[vendorSlug]/page.tsx`: Public Server Component (with client interactive viewer) rendering the portfolio.
4. `src/app/vendor/page.tsx`: Extended with a "Portofolio" management tab.
