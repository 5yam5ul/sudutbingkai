import { NextResponse } from 'next/server';
import { getAllVendors, saveVendor, updateVendor, deleteVendor } from '@/lib/db';

export async function GET() {
  try {
    const vendors = await getAllVendors();
    const cleanVendors = vendors.filter(v => v.id !== 'admin_sudutbingkai' && !v.email?.toLowerCase().includes('admin'));
    return NextResponse.json({ success: true, vendors: cleanVendors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, companyName, email, phone, instagram, logoUrl, tier, partnerTier, referralCode, commissionRate, walletBalance, wholesaleTokens, bankDetails, city } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama vendor / PIC wajib diisi' }, { status: 400 });
    }

    const vendorId = body.id || `vendor_${Date.now()}`;
    const vendorEmail = email ? email.trim().toLowerCase() : `vendor_${Date.now()}@sudutbingkai.id`;

    if (vendorId === 'admin_sudutbingkai' || vendorEmail.includes('admin@sudutbingkai.id')) {
      return NextResponse.json({ success: false, error: 'Akun Super Admin tidak dapat didaftarkan sebagai vendor' }, { status: 400 });
    }

    const newVendor = {
      id: vendorId,
      name: name.trim(),
      companyName: (companyName || name).trim(),
      email: vendorEmail,
      phone: phone ? phone.trim() : '',
      instagram: instagram ? instagram.trim() : '',
      logoUrl: logoUrl || '',
      tier: tier || 'pro',
      partnerTier: partnerTier || 'regular',
      referralCode: referralCode ? referralCode.trim().toUpperCase() : undefined,
      commissionRate: commissionRate !== undefined ? Number(commissionRate) : (partnerTier === 'vip' ? 0.20 : partnerTier === 'pro' ? 0.15 : 0.12),
      walletBalance: walletBalance !== undefined ? Number(walletBalance) : 0,
      totalEarnings: 0,
      wholesaleTokens: wholesaleTokens !== undefined ? Number(wholesaleTokens) : 0,
      bankDetails: bankDetails || {
        bankName: 'BCA',
        accountNumber: '',
        accountHolder: name.trim()
      },
      city: city || 'Jakarta',
      clientCount: 0,
      createdAt: new Date().toISOString()
    };

    const saved = await saveVendor(newVendor);
    return NextResponse.json({ success: true, vendor: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID vendor diperlukan' }, { status: 400 });
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.companyName !== undefined) updates.companyName = body.companyName.trim();
    if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.instagram !== undefined) updates.instagram = body.instagram.trim();
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
    if (body.tier !== undefined) updates.tier = body.tier;
    if (body.partnerTier !== undefined) {
      updates.partnerTier = body.partnerTier;
      if (body.commissionRate === undefined) {
        updates.commissionRate = body.partnerTier === 'vip' ? 0.20 : body.partnerTier === 'pro' ? 0.15 : 0.12;
      }
    }
    if (body.referralCode !== undefined) updates.referralCode = body.referralCode.trim().toUpperCase();
    if (body.commissionRate !== undefined) updates.commissionRate = Number(body.commissionRate);
    if (body.walletBalance !== undefined) updates.walletBalance = Number(body.walletBalance);
    if (body.totalEarnings !== undefined) updates.totalEarnings = Number(body.totalEarnings);
    if (body.wholesaleTokens !== undefined) updates.wholesaleTokens = Number(body.wholesaleTokens);
    if (body.bankDetails !== undefined) updates.bankDetails = body.bankDetails;
    if (body.city !== undefined) updates.city = body.city;

    // Handle relative balance adjustment if passed
    if (body.adjustBalance !== undefined) {
      const allVendors = await getAllVendors();
      const current = allVendors.find(v => v.id === body.id);
      const currentBal = current?.walletBalance || 0;
      updates.walletBalance = Math.max(0, currentBal + Number(body.adjustBalance));
    }

    // Handle relative wholesale tokens adjustment
    if (body.adjustTokens !== undefined) {
      const allVendors = await getAllVendors();
      const current = allVendors.find(v => v.id === body.id);
      const currentTokens = current?.wholesaleTokens || 0;
      updates.wholesaleTokens = Math.max(0, currentTokens + Number(body.adjustTokens));
    }

    const updated = await updateVendor(body.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, vendor: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id vendor diperlukan' }, { status: 400 });
    }

    const success = await deleteVendor(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus vendor' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Vendor berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
