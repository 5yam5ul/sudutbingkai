import { NextResponse } from 'next/server';
import {
  createTestimonialSubmission,
  getAllTestimonials,
  getTestimonialsByVendor,
  getTestimonialsByEvent,
  updateTestimonialStatus,
  deleteTestimonial,
  getEventById
} from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const eventId = searchParams.get('eventId');
    const session = getServerSession(request);

    let testimonials = [];
    if (vendorId) {
      if (session && session.role === 'vendor') {
        const isSelf = session.id === vendorId || (session.email && session.email.toLowerCase() === vendorId.toLowerCase());
        if (!isSelf) {
          return NextResponse.json({
            success: false,
            error: 'Akses ditolak: Anda tidak memiliki akses ke testimoni vendor lain.'
          }, { status: 403 });
        }
      }
      testimonials = await getTestimonialsByVendor(vendorId);
    } else if (eventId) {
      testimonials = await getTestimonialsByEvent(eventId);
    } else {
      // If no filters provided: Admin sees all, public only sees approved social proof
      const all = await getAllTestimonials();
      if (session?.role === 'admin') {
        testimonials = all;
      } else {
        testimonials = all
          .filter(t => t.status === 'approved')
          .map(t => ({
            id: t.id,
            eventTitle: t.eventTitle,
            submitterName: t.submitterName,
            videoUrl: t.videoUrl,
            caption: t.caption,
            durationSeconds: t.durationSeconds,
            status: t.status,
            submittedAt: t.submittedAt
          }));
      }
    }

    return NextResponse.json({ success: true, testimonials });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat video testimoni' },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventId,
      submitterType = 'vendor',
      submitterId = 'vendor-1',
      submitterName = 'Mitra Vendor',
      submitterEmail,
      videoType = 'link',
      videoUrl,
      durationSeconds = 60,
      caption
    } = body;

    if (!eventId || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Acara dan URL video wajib diisi' },
        { status: 400 }
      );
    }

    if (durationSeconds < 60) {
      return NextResponse.json(
        { success: false, error: 'Durasi video testimoni minimal 60 detik (1 menit)' },
        { status: 400 }
      );
    }

    const event = await getEventById(eventId);
    const eventTitle = event ? (event.coupleOrHost || event.title) : 'Acara Sudut Bingkai';

    const submission = await createTestimonialSubmission({
      eventId,
      eventTitle,
      submitterType,
      submitterId,
      submitterName,
      submitterEmail,
      videoType,
      videoUrl,
      durationSeconds: Number(durationSeconds),
      caption: caption || 'Video keseruan tamu dan interaksi QR live gallery',
      rewardAmount: 50000 // Bonus Rp 50.000 / video terverifikasi
    });

    return NextResponse.json({
      success: true,
      message: 'Video testimoni berhasil dikirim untuk proses verifikasi kurasi.',
      submission
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirim video testimoni' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat memvalidasi video testimoni' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'ID dan status (approved/rejected) diperlukan' },
        { status: 400 }
      );
    }

    const updated = await updateTestimonialStatus(id, status, adminNotes);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Data video testimoni tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Status testimoni berhasil diperbarui menjadi ${status}.`,
      testimonial: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui status testimoni' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus video testimoni' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Parameter id testimoni diperlukan' },
        { status: 400 }
      );
    }

    const success = await deleteTestimonial(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Gagal menghapus data testimoni' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video testimoni berhasil dihapus'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus video testimoni' },
      { status: 500 }
    );
  }
}

