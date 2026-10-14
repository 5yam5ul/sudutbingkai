import { NextResponse } from 'next/server';
import { getAllVendors, saveVendor, updateVendor, deleteVendor } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { isMayarConfigured } from '@/lib/mayar';

export async function GET(req: Request) {
  try {
    const session = getServerSession(req);
    const vendors = await getAllVendors();
    const cleanVendors = vendors.filter(v => v.id !== 'admin_sudutbingkai' && !v.email?.toLowerCase().includes('admin'));

    // 1. Super Admin: full access to all vendors
    if (session?.role === 'admin') {
      return NextResponse.json({ success: true, vendors: cleanVendors });
    }

    // 2. Logged-in Vendor: full access to their own account, masked for others
    if (session?.role === 'vendor') {
      const sanitized = cleanVendors.map(v => {
        const isSelf = v.id === session.id || (session.email && v.email?.toLowerCase() === session.email.toLowerCase());
        if (isSelf) return v;
        return {
          id: v.id,
          name: v.name,
          companyName: v.companyName,
          instagram: v.instagram,
          logoUrl: v.logoUrl,
          tier: v.tier,
          partnerTier: v.partnerTier,
          city: v.city
        };
      });
      return NextResponse.json({ success: true, vendors: sanitized });
    }

    // 3. Public / Anonymous: Strictly strip all sensitive financial & bank details
    const publicVendors = cleanVendors.map(v => ({
      id: v.id,
      name: v.name,
      companyName: v.companyName,
      instagram: v.instagram,
      logoUrl: v.logoUrl,
      tier: v.tier,
      partnerTier: v.partnerTier,
      city: v.city
    }));

    return NextResponse.json({ success: true, vendors: publicVendors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const session = getServerSession(req);
    const isAdmin = session?.role === 'admin';

    const body = await req.json();
    const { name, companyName, email, phone, instagram, logoUrl, tier, partnerTier, referralCode, commissionRate, walletBalance, bankDetails, city } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama vendor / PIC wajib diisi' }, { status: 400 });
    }

    const vendorId = body.id || `vendor_${Date.now()}`;
    const vendorEmail = email ? email.trim().toLowerCase() : `vendor_${Date.now()}@sudutbingkai.id`;

    if (vendorId === 'admin_sudutbingkai' || vendorEmail.includes('admin@sudutbingkai.id')) {
      return NextResponse.json({ success: false, error: 'Akun Super Admin tidak dapat didaftarkan sebagai vendor' }, { status: 400 });
    }

    // Check if updating an existing vendor profile via POST (e.g. handleSaveBranding)
    const allVendors = await getAllVendors();
    const existing = allVendors.find(v => v.id === vendorId || (v.email && v.email.toLowerCase() === vendorEmail));

    if (existing) {
      const isSelf = session?.role === 'vendor' && (
        session.id === existing.id ||
        (session.email && existing.email && session.email.toLowerCase() === existing.email.toLowerCase())
      );
      if (!isAdmin && !isSelf) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah profil vendor ini.'
        }, { status: 403 });
      }

      const updatedVendor = {
        ...existing,
        name: name.trim(),
        companyName: (companyName || name).trim(),
        phone: phone !== undefined ? phone.trim() : existing.phone,
        instagram: instagram !== undefined ? instagram.trim() : existing.instagram,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        city: city || existing.city || 'Jakarta',
        bankDetails: bankDetails || existing.bankDetails,
        // Financial & tier fields strictly preserved unless Super Admin
        partnerTier: isAdmin && partnerTier ? partnerTier : existing.partnerTier,
        commissionRate: isAdmin && commissionRate !== undefined ? Number(commissionRate) : existing.commissionRate,
        walletBalance: isAdmin && walletBalance !== undefined ? Number(walletBalance) : existing.walletBalance
      };

      const saved = await saveVendor(updatedVendor);
      return NextResponse.json({ success: true, vendor: saved });
    }

    // New vendor registration: lock financial & tier privileges unless created by Super Admin
    const safePartnerTier = isAdmin ? (partnerTier || 'regular') : 'regular';
    const safeCommissionRate = isAdmin && commissionRate !== undefined
      ? Number(commissionRate)
      : (safePartnerTier === 'vip' ? 0.20 : safePartnerTier === 'pro' ? 0.15 : 0.12);

    const newVendor = {
      id: vendorId,
      name: name.trim(),
      companyName: (companyName || name).trim(),
      email: vendorEmail,
      phone: phone ? phone.trim() : '',
      instagram: instagram ? instagram.trim() : '',
      logoUrl: logoUrl || '',
      tier: isAdmin ? (tier || 'pro') : 'starter',
      partnerTier: safePartnerTier,
      referralCode: referralCode ? referralCode.trim().toUpperCase() : undefined,
      commissionRate: safeCommissionRate,
      walletBalance: isAdmin && walletBalance !== undefined ? Number(walletBalance) : 0,
      totalEarnings: 0,
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
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk memperbarui data vendor.'
      }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID vendor diperlukan' }, { status: 400 });
    }

    const allVendors = await getAllVendors();
    const current = allVendors.find(v => v.id === body.id);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = session.role === 'admin';
    const isSelf = session.role === 'vendor' && (
      session.id === current.id ||
      (session.email && current.email && session.email.toLowerCase() === current.email.toLowerCase())
    );

    if (!isAdmin && !isSelf) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah data vendor ini.'
      }, { status: 403 });
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.companyName !== undefined) updates.companyName = body.companyName.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.instagram !== undefined) updates.instagram = body.instagram.trim();
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
    if (body.bankDetails !== undefined) updates.bankDetails = body.bankDetails;
    if (body.city !== undefined) updates.city = body.city;
    if (body.referralCode !== undefined) updates.referralCode = body.referralCode.trim().toUpperCase();

    // Sensitive administrative & financial fields: Strictly locked to Super Admin
    if (isAdmin) {
      if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
      if (body.tier !== undefined) updates.tier = body.tier;
      if (body.partnerTier !== undefined) {
        updates.partnerTier = body.partnerTier;
        if (body.commissionRate === undefined) {
          updates.commissionRate = body.partnerTier === 'vip' ? 0.20 : body.partnerTier === 'pro' ? 0.15 : 0.12;
        }
      }
      if (body.commissionRate !== undefined) updates.commissionRate = Number(body.commissionRate);
      if (body.walletBalance !== undefined) updates.walletBalance = Number(body.walletBalance);
      if (body.totalEarnings !== undefined) updates.totalEarnings = Number(body.totalEarnings);

      // Handle relative balance adjustment if passed by Admin
      if (body.adjustBalance !== undefined) {
        const currentBal = current.walletBalance || 0;
        updates.walletBalance = Math.max(0, currentBal + Number(body.adjustBalance));
      }
    } else if (!isMayarConfigured && isSelf) {
      // Only in local sandbox simulation mode when Mayar is not configured
      if (body.adjustBalance !== undefined) {
        const currentBal = current.walletBalance || 0;
        updates.walletBalance = Math.max(0, currentBal + Number(body.adjustBalance));
      }
      if (body.totalEarnings !== undefined) {
        updates.totalEarnings = Number(body.totalEarnings);
      }
    } else {
      // If non-admin attempts to tamper with financial/tier fields in production, reject explicitly
      if (
        body.walletBalance !== undefined ||
        body.adjustBalance !== undefined ||
        body.partnerTier !== undefined ||
        body.commissionRate !== undefined
      ) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Perubahan saldo komisi dan tingkatan kemitraan hanya dapat diproses oleh sistem pembayaran resmi atau Super Admin.'
        }, { status: 403 });
      }
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
    const session = getServerSession(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus akun mitra vendor' }, { status: 403 });
    }

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

