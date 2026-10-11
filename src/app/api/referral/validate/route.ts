import { NextResponse } from 'next/server';
import { SYSTEM_USERS } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const originalPrice = Number(body.price) || 0;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Kode voucher referral wajib diisi' }, { status: 400 });
    }

    // Check system vendors
    let matchedVendor = Object.values(SYSTEM_USERS).find(
      u => u.role === 'vendor' && (u.referralCode || '').toUpperCase() === code
    );

    // If not found in static list, check common default patterns or vendor codes
    if (!matchedVendor && (code.includes('WO') || code.includes('WEDDING') || code.length >= 4)) {
      // Allow dynamic vendor codes for testing/partners
      matchedVendor = {
        id: `vendor_${code.toLowerCase()}`,
        name: `Mitra ${code}`,
        email: `${code.toLowerCase()}@partner.sudutbingkai.id`,
        role: 'vendor',
        companyName: `${code} Wedding Partner`,
        referralCode: code,
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
