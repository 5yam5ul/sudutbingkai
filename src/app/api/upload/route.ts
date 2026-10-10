import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'frame';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    const mime = file.type;
    if (type === 'frame' && !mime.includes('png')) {
      return NextResponse.json({ success: false, error: 'Bingkai khusus harus berformat PNG dengan background transparan' }, { status: 400 });
    }

    // Target folder
    const subFolder = type === 'frame' ? 'frames' : 'general';
    const targetDir = path.join(process.cwd(), 'public', 'uploads', subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = file.name.split('.').pop() || 'png';
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetPath = path.join(targetDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    const publicUrl = `/uploads/${subFolder}/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
