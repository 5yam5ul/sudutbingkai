import { NextResponse } from 'next/server';
import { SYSTEM_USERS } from '@/lib/auth';
import { getAllVendors } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const originalPrice = Number(body.price) || 0;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Kode voucher referral wajib diisi' }, { status: 400 });
    }

    let matchedVendor: any = null;

    // 1. Check registered vendors from database first (PostgreSQL + Local JSON)
    try {
      const dbVendors = await getAllVendors();
      const found = dbVendors.find(
        v => v.referralCode && (
          v.referralCode.toUpperCase() === code ||
          (code === 'VOWSANDCO10' && v.referralCode.toUpperCase() === 'VOWSANDCO')
        )
      );
      if (found) {
        if (found.status === 'suspended') {
          return NextResponse.json({
            success: false,
            error: 'Kode kemitraan vendor ini sedang ditangguhkan dan tidak dapat digunakan.'
          }, { status: 403 });
        }
        matchedVendor = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: 'vendor',
          companyName: found.companyName || found.name,
          referralCode: found.referralCode || code,
          partnerTier: found.partnerTier || 'regular',
          commissionRate: found.commissionRate
        };
      }
    } catch (err) {
      console.warn('Error reading vendors in referral validate:', err);
    }

    // 2. Fallback to system static vendors if not present in database
    if (!matchedVendor) {
      matchedVendor = Object.values(SYSTEM_USERS).find(
        u => u.role === 'vendor' && (
          (u.referralCode || '').toUpperCase() === code ||
          (code === 'VOWSANDCO10' && u.referralCode === 'VOWSANDCO')
        )
      );
    }

    if (!matchedVendor && code === 'KREATIV10') {
      matchedVendor = {
        id: 'vendor_kreativ',
        name: 'Kreativ Studio',
        email: 'halo@kreativ.id',
        role: 'vendor',
        companyName: 'Kreativ Wedding Studio',
        referralCode: 'KREATIV10',
        partnerTier: 'pro'
      };
    }

    if (!matchedVendor) {
      return NextResponse.json({ 
        success: false, 
        error: 'Kode mitra tidak valid atau sudah kedaluwarsa. Periksa kembali penulisan kode Anda.' 
      }, { status: 404 });
    }

    const discountPercent = 10;
    const discountAmount = Math.round((originalPrice * discountPercent) / 100);
    const finalPrice = Math.max(0, originalPrice - discountAmount);
    const rawRate = Number(matchedVendor.commissionRate) || 0;
    const rateDecimal = rawRate > 0
      ? (rawRate <= 1 ? rawRate : rawRate / 100)
      : (matchedVendor.partnerTier === 'vip' ? 0.20 : matchedVendor.partnerTier === 'pro' ? 0.15 : 0.12);
    const commissionPercent = Math.round(rateDecimal * 100);
    const commissionAmount = Math.round(finalPrice * rateDecimal);

    return NextResponse.json({
      success: true,
      valid: true,
      referralCode: code,
      vendorId: matchedVendor.id,
      vendorName: matchedVendor.companyName || matchedVendor.name,
      discountPercent,
      discountAmount,
      finalPrice,
      commissionPercent,
      commissionAmount,
      message: `Kode kemitraan ${matchedVendor.companyName || matchedVendor.name} berhasil diterapkan! Anda hemat 10% (Rp ${discountAmount.toLocaleString('id-ID')}).`
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
