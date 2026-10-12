import { NextResponse } from 'next/server';
import { getAllAddons, saveAddon, updateAddon, deleteAddon } from '@/lib/db';
import { EventAddonItem } from '@/lib/types';

export async function GET() {
  try {
    const addons = await getAllAddons();
    return NextResponse.json({ success: true, addons });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category, description, price, costPrice, unit, freeShippingJabodetabek, imagePreviewUrl, isPopular } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Nama dan harga add-on wajib diisi' }, { status: 400 });
    }

    const id = body.id || `addon_${Date.now()}`;
    const newAddon: EventAddonItem = {
      id,
      name: name.trim(),
      category: category || 'physical_qr',
      description: (description || '').trim(),
      price: Number(price),
      priceFormatted: `Rp ${Number(price).toLocaleString('id-ID')}`,
      costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
      unit: unit || '1 set',
      freeShippingJabodetabek: freeShippingJabodetabek !== false,
      imagePreviewUrl: imagePreviewUrl || undefined,
      isPopular: !!isPopular,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const saved = await saveAddon(newAddon);
    return NextResponse.json({ success: true, addon: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID add-on diperlukan' }, { status: 400 });
    }

    const updates: Partial<EventAddonItem> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.price !== undefined) {
      updates.price = Number(body.price);
      updates.priceFormatted = `Rp ${Number(body.price).toLocaleString('id-ID')}`;
    }
    if (body.costPrice !== undefined) updates.costPrice = Number(body.costPrice);
    if (body.unit !== undefined) updates.unit = body.unit.trim();
    if (body.freeShippingJabodetabek !== undefined) updates.freeShippingJabodetabek = body.freeShippingJabodetabek;
    if (body.imagePreviewUrl !== undefined) updates.imagePreviewUrl = body.imagePreviewUrl;
    if (body.isPopular !== undefined) updates.isPopular = body.isPopular;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const updated = await updateAddon(body.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Add-on tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, addon: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id add-on diperlukan' }, { status: 400 });
    }

    const success = await deleteAddon(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus add-on' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Add-on berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
