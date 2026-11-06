# Vendor Exclusive Portfolio Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide photography vendors with a customizable, high-converting public portfolio landing page at `sudutbingkai.id/[vendorSlug]` with social-style banner, logo, bio, WhatsApp booking CTA, and custom category album cards powered by Google Drive folders with zero server storage costs.

**Architecture:** Next.js App Router dynamic route `src/app/[vendorSlug]/page.tsx` querying vendor portfolio metadata stored in Supabase/local fallback, with photos fetched on-demand from the vendor's Google Drive via `/api/proofing/drive` and rendered in an interactive flipbook slideshow modal.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Google Drive API v3.

**Spec:** `docs/superpowers/specs/2026-11-07-vendor-portfolio-landing-design.md`

## Global Constraints
- Zero file storage footprint for portfolio photos: photos must stream directly from Google Drive CDN (`lh3.googleusercontent.com` / `thumbnailLink`).
- Prevent URL slug collision with reserved routes: `['admin', 'vendor', 'login', 'create', 'api', 'proof', 'dashboard', 'panduan', 'cam', 'event', 'invoice']`.
- Backward-compatible with existing vendor records in Supabase and `data/vendors.json`.
- Production build (`next build`) must pass with 0 errors.

## Review Focus
1. **Invalid or Private Google Drive Link:** When a vendor enters a non-public or invalid link, show clear Indonesian error feedback instructing them to set permission to "Siapa saja yang memiliki link dapat melihat".
2. **Empty Folder:** When a Google Drive folder has no images, show a friendly empty state instead of a broken slideshow.
3. **Reserved Slug Collision:** When a vendor tries to set their slug to `admin` or `dashboard`, reject with validation error.
4. **Mobile Responsiveness:** Ensure banner, floating avatar, and album grid look sleek on smartphone screens (iPhone/Android).
5. **SEO & WhatsApp Preview:** Ensure OpenGraph meta tags populate so sharing the portfolio link on WhatsApp/Instagram displays the vendor's cover, name, and bio.

---

### Task 1: Data Types & Database Helpers
**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db.ts`

**Steps:**
- [ ] Add `VendorPortfolioAlbum` and `VendorPortfolioProfile` interfaces in `src/lib/types.ts`.
- [ ] Extend `UserAccount` in `src/lib/types.ts` with `slug`, `bio`, `coverUrl`, `whatsapp`, and `portfolioAlbums`.
- [ ] Add `getVendorBySlug(slug: string)` and `updateVendorPortfolio(vendorId: string, profile: Partial<VendorPortfolioProfile>)` in `src/lib/db.ts`.
- [ ] Ensure local fallback reads and persists portfolio fields to `data/vendors.json`.

---

### Task 2: Portfolio API Routes
**Files:**
- Create: `src/app/api/vendors/portfolio/route.ts`

**Steps:**
- [ ] Implement `GET`: query portfolio by `?slug=...` or `?vendorId=...`. Return public profile and albums.
- [ ] Implement `PUT`: verify logged-in vendor session, validate slug (lowercase, alphanum-dash, not in reserved list), sanitize input, and persist portfolio data via `updateVendorPortfolio`.
- [ ] Test API responses with sample payload.

---

### Task 3: Interactive Slideshow / Photobook Modal
**Files:**
- Create: `src/components/vendor-portfolio/PortfolioViewerModal.tsx`

**Steps:**
- [ ] Build modal using Dialog/Portal with dark blurred backdrop.
- [ ] Fetch photos on-demand from `/api/proofing/drive?folderId=${cleanFolderId}` with loading skeleton.
- [ ] Add book-flip / smooth cross-fade animation between slides.
- [ ] Support keyboard navigation (ArrowLeft, ArrowRight, Escape) and mobile touch swiping.
- [ ] Add photo counter (`Foto 1 dari 24`), title, and close button.

---

### Task 4: Public Portfolio Landing Page
**Files:**
- Create: `src/app/[vendorSlug]/page.tsx`

**Steps:**
- [ ] Check if `vendorSlug` matches reserved routes (let Next.js or child routes handle it if so).
- [ ] Fetch vendor profile using `getVendorBySlug(vendorSlug)`. If not found, render an elegant 404/not found page.
- [ ] Generate dynamic metadata (`generateMetadata`) for OpenGraph preview (cover banner, vendor name, bio).
- [ ] Render Hero header: Cover banner (aspect 16:6 or 3:1), floating vendor logo avatar, verified badge, company name, bio description, city tag, Instagram link, and WhatsApp CTA button ("Tanya Tanggal & Reservasi").
- [ ] Render Album Grid: Cards featuring thumbnail cover, category title, photo count, and hover zoom effect.
- [ ] Connect click event to open `PortfolioViewerModal`.

---

### Task 5: Vendor Dashboard Portfolio Management Tab
**Files:**
- Modify: `src/app/vendor/page.tsx`

**Steps:**
- [ ] Add new tab **"Portofolio"** to the vendor dashboard sidebar/tab bar.
- [ ] Build Profile & Branding section: edit `slug`, `bio`, `whatsapp`, and upload/input `coverUrl`.
- [ ] Build Album Categories Manager:
  - Add Album modal: Name, Google Drive Folder URL, Cover Image selector (fetch sample thumbnails from drive or upload custom URL).
  - List of existing albums with edit, delete, and reorder controls.
- [ ] Add preview link header with "Salin Link Portofolio" and "Buka Halaman" buttons.

---

### Task 6: Build Verification & End-to-End Test
**Files:**
- Test via terminal build and browser preview.

**Steps:**
- [ ] Run `cmd /c "npm run build"` to verify zero TypeScript errors.
- [ ] Verify clean git status and commit changes.
