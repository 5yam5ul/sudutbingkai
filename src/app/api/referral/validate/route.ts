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

    // 1. Check system static vendors
    let matchedVendor = Object.values(SYSTEM_USERS).find(
      u => u.role === 'vendor' && (u.referralCode || '').toUpperCase() === code
    );

    // 2. Check registered vendors from database (Supabase + Local)
    if (!matchedVendor) {
      try {
        const dbVendors = await getAllVendors();
        const found = dbVendors.find(
          v => (v.referralCode && v.referralCode.toUpperCase() === code) ||
               (v.id && v.id.toUpperCase() === code)
        );
        if (found) {
          matchedVendor = {
            id: found.id,
            name: found.name,
            email: found.email,
            role: 'vendor',
            companyName: found.companyName || found.name,
            referralCode: found.referralCode || code,
            partnerTier: found.partnerTier || 'pro'
          };
        }
      } catch (err) {
        console.warn('Error reading vendors in referral validate:', err);
      }
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
    const commissionPercent = matchedVendor.partnerTier === 'vip' ? 20 : matchedVendor.partnerTier === 'pro' ? 15 : 12;
    const commissionAmount = Math.round((finalPrice * commissionPercent) / 100);

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
