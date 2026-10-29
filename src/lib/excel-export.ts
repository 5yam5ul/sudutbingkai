/**
 * ExcelJS Export Engine for SudutBingkai
 * Generates styled, professional .xlsx spreadsheets with brand colors, auto column widths, and proper formatting.
 */

import ExcelJS from 'exceljs';

interface GuestExportItem {
  no: number;
  guestName: string;
  checkedInAt: string;
  photoCount?: number;
  hasVoiceNote?: boolean;
  hasVideoWish?: boolean;
}

export async function exportGuestbookToExcel(
  filename: string,
  eventTitle: string,
  coupleOrHost: string | undefined,
  guests: GuestExportItem[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SudutBingkai';
  workbook.lastModifiedBy = 'SudutBingkai System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Buku Tamu Acara', {
    views: [{ showGridLines: true }]
  });

  // 1. Title Banner
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `BUKU TAMU DIGITAL — ${eventTitle.toUpperCase()}`;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC27803' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;

  // Subtitle / Host
  sheet.mergeCells('A2:F2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Tuan Rumah: ${coupleOrHost || '-'} | Total Tamu Hadir: ${guests.length} Orang | Diunduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6E6E73' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  // Row 3: Empty spacer
  sheet.getRow(3).height = 10;

  // 2. Table Headers
  const headers = [
    { key: 'no', header: 'No', width: 8 },
    { key: 'guestName', header: 'Nama Lengkap Tamu', width: 32 },
    { key: 'checkedInAt', header: 'Waktu Check-In', width: 24 },
    { key: 'photoCount', header: 'Jumlah Foto Diambil', width: 22 },
    { key: 'hasVoiceNote', header: 'Pesan Suara', width: 16 },
    { key: 'hasVideoWish', header: 'Video Ucapan', width: 16 }
  ];

  sheet.getRow(4).values = headers.map(h => h.header);
  sheet.getRow(4).height = 28;

  const headerRow = sheet.getRow(4);
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1D1F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FFC27803' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // 3. Populate Rows
  guests.forEach((g, idx) => {
    const rowNum = idx + 5;
    const row = sheet.getRow(rowNum);
    row.values = [
      idx + 1,
      g.guestName,
      g.checkedInAt,
      g.photoCount ?? '-',
      g.hasVoiceNote ? 'Ada (Audio)' : '-',
      g.hasVideoWish ? 'Ada (Video)' : '-'
    ];
    row.height = 22;

    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1D1D1F' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFFBFBFA' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        left: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        right: { style: 'thin', color: { argb: 'FFE5E5EA' } }
      };

      if (colNum === 1 || colNum >= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Set explicit column widths
  headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = h.width;
  });

  // 4. Save and Trigger Download in Browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-zA-Z0-9_\-]/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAdminOverviewToExcel(
  filename: string,
  events: Array<{
    id: string;
    title: string;
    category: string;
    packageTier: string;
    paymentStatus: string;
    eventDate?: string;
    guestCount?: number;
    photoCount?: number;
  }>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SudutBingkai Admin';

  const sheet = workbook.addWorksheet('Rekapitulasi Acara');

  // Title
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'REKAPITULASI ACARA & PENGGUNAAN SUDUTBINGKAI';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC27803' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  const cols = [
    { header: 'No', width: 6 },
    { header: 'Nama Acara', width: 30 },
    { header: 'Kategori', width: 16 },
    { header: 'Paket', width: 14 },
    { header: 'Status Pembayaran', width: 18 },
    { header: 'Tanggal Acara', width: 18 },
    { header: 'Total Foto', width: 14 }
  ];

  sheet.getRow(3).values = cols.map(c => c.header);
  sheet.getRow(3).height = 24;
  sheet.getRow(3).eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D1D1F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  events.forEach((ev, idx) => {
    const row = sheet.getRow(idx + 4);
    row.values = [
      idx + 1,
      ev.title,
      ev.category,
      ev.packageTier.toUpperCase(),
      ev.paymentStatus === 'paid' ? 'LUNAS' : 'PENDING',
      ev.eventDate || '-',
      ev.photoCount ?? 0
    ];
    row.height = 20;
    row.eachCell((cell, colIdx) => {
      cell.font = { name: 'Segoe UI', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        left: { style: 'thin', color: { argb: 'FFE5E5EA' } },
        right: { style: 'thin', color: { argb: 'FFE5E5EA' } }
      };
      if (colIdx === 1 || colIdx >= 3) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  cols.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
