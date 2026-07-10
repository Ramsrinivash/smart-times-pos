/**
 * Smart Times — Export Utilities
 * Provides CSV and Excel (.xlsx) export functions for all reports.
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export data as CSV file.
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Data rows
 * @param {string} filename - File name (without extension)
 */
export const exportCSV = (headers, rows, filename) => {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smarttimes_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export data as Excel (.xlsx) file.
 * @param {string[]} headers - Column headers
 * @param {any[][]} rows - Data rows
 * @param {string} filename - File name (without extension)
 * @param {string} sheetName - Sheet tab name
 */
export const exportExcel = (headers, rows, filename, sheetName = 'Report') => {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row (bold)
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1a1a2e' } },
      alignment: { horizontal: 'center' }
    };
  }

  // Auto column widths
  const colWidths = headers.map((h, i) => {
    const maxDataLen = Math.max(
      String(h).length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(maxDataLen + 4, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Add metadata
  wb.Props = {
    Title: `Smart Times - ${filename}`,
    Company: 'Smart Times Watch Showroom',
    CreatedDate: new Date()
  };

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `smarttimes_${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
