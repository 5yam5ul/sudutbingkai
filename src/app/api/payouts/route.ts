import { NextResponse } from 'next/server';
import { getPayoutRequests, createPayoutRequest, updatePayoutStatus, deletePayout } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId') || undefined;

    const payouts = await getPayoutRequests(vendorId);
    return NextResponse.json({ success: true, payouts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendorId, vendorEmail, vendorName, companyName, amount, bankDetails, notes } = body;

    if (!vendorId || !amount || !bankDetails) {
      return NextResponse.json({ success: false, error: 'Data penarikan tidak lengkap' }, { status: 400 });
    }

    if (amount < 100000) {
      return NextResponse.json({ success: false, error: 'Batas minimal penarikan adalah Rp 100.000' }, { status: 400 });
    }

    const payout = await createPayoutRequest({
      vendorId,
      vendorEmail: vendorEmail || 'vendor@sudutbingkai.id',
      vendorName: vendorName || 'Mitra Vendor',
      companyName,
      amount: Number(amount),
      bankDetails,
      notes
    });

    return NextResponse.json({ success: true, payout });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, proofUrl, notes } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Parameter id dan status valid diperlukan' }, { status: 400 });
    }

    const updated = await updatePayoutStatus(id, status, proofUrl, notes);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Permintaan penarikan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, payout: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id penarikan diperlukan' }, { status: 400 });
    }

    const success = await deletePayout(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus data penarikan' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Data penarikan berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
