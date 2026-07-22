import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const triggerDownload = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const sanitizePdfText = (value) => String(value ?? '')
  .replace(/\u00e2\u20ac[\u201c\u201d]/g, '-')
  .replace(/\u00e2\u20ac\u00a2|\u00c2\u00b7/g, ' - ')
  .replace(/\u00e2\u2020\u2019/g, '->')
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/[\u2022\u25cf\u25aa]/g, '-')
  .replace(/[\u2713\u2714]/g, 'Yes')
  .replace(/[\u2715\u2716\u00d7]/g, 'x')
  .normalize('NFKD')
  .replace(/[^\x20-\x7E\n]/g, '')
  .replace(/[ \t]+/g, ' ')
  .trim();

export const downloadCsv = (filename, headers, rows) => {
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  triggerDownload(filename, new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
};

// SpreadsheetML is a genuine Excel workbook format and is downloaded with its correct .xls extension.
export const downloadExcel = (filename, sheetName, headers, rows) => {
  const xmlEscape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const rowXml = (row, header = false) => `<Row>${row.map(value =>
    `<Cell${header ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
  ).join('')}</Row>`;
  const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="${xmlEscape(sheetName)}"><Table>${rowXml(headers, true)}${rows.map(row => rowXml(row)).join('')}</Table></Worksheet></Workbook>`;
  triggerDownload(filename, new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }));
};

export const downloadPdf = (filename, title, content = []) => {
  const document = Array.isArray(content) ? { paragraphs: content } : (content || {});
  const pdf = new jsPDF({ orientation: document.orientation || 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const safeTitle = sanitizePdfText(title) || 'KSP Report';

  const drawHeader = () => {
    pdf.setFillColor(20, 55, 92);
    pdf.rect(0, 0, pageWidth, 23, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('KARNATAKA STATE POLICE', margin, 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text('MADHUKAR - MODERN ANALYTICS AND DATA HUB', margin, 16);
    pdf.text('OFFICIAL USE', pageWidth - margin, 13, { align: 'right' });
  };

  const addPage = () => { pdf.addPage(); drawHeader(); return 32; };
  const ensureSpace = (y, needed = 12) => y + needed > pageHeight - 18 ? addPage() : y;
  drawHeader();
  pdf.setTextColor(25, 35, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  const titleLines = pdf.splitTextToSize(safeTitle, pageWidth - margin * 2);
  pdf.text(titleLines, margin, 34);
  let y = 34 + titleLines.length * 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(95, 105, 115);
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 7;
  pdf.setDrawColor(205, 212, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  const renderParagraphs = (lines, startY) => {
    let cursor = startY;
    (lines || []).forEach(rawLine => {
    const line = sanitizePdfText(rawLine);
    if (!line) { cursor += 3; return; }
    const heading = line.endsWith(':') || (line.length < 70 && line === line.toUpperCase());
    pdf.setFont('helvetica', heading ? 'bold' : 'normal');
    pdf.setFontSize(heading ? 10 : 8.7);
    pdf.setTextColor(heading ? 20 : 50, heading ? 55 : 62, heading ? 92 : 72);
    const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2);
    const lineHeight = heading ? 5 : 4.3;
    cursor = ensureSpace(cursor, wrapped.length * lineHeight);
    pdf.text(wrapped, margin, cursor);
    cursor += wrapped.length * lineHeight + (heading ? 2 : 0.8);
    });
    return cursor;
  };

  if (document.metadata?.length) {
    autoTable(pdf, {
      startY: y, margin: { left: margin, right: margin },
      body: document.metadata.map(item => [sanitizePdfText(item.label), sanitizePdfText(item.value)]),
      theme: 'plain', styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.5, textColor: [55, 65, 75] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38, textColor: [20, 55, 92] } },
    });
    y = pdf.lastAutoTable.finalY + 6;
  }
  y = renderParagraphs(document.paragraphs, y);
  (document.sections || []).forEach(section => {
    y = ensureSpace(y, 14);
    if (section.heading) {
      pdf.setFillColor(232, 239, 246); pdf.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      pdf.setTextColor(20, 55, 92); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
      pdf.text(sanitizePdfText(section.heading), margin + 3, y + 1); y += 8;
    }
    y = renderParagraphs(section.paragraphs, y);
    if (section.keyValues?.length) {
      autoTable(pdf, {
        startY: y, margin: { left: margin, right: margin },
        body: section.keyValues.map(item => [sanitizePdfText(item.label), sanitizePdfText(item.value)]),
        theme: 'grid', styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, valign: 'top' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, fillColor: [244, 247, 250] } },
        didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); },
      });
      y = pdf.lastAutoTable.finalY + 6;
    }
    if (section.table?.headers?.length) {
      autoTable(pdf, {
        startY: y, margin: { left: margin, right: margin, top: 30, bottom: 18 },
        head: [section.table.headers.map(sanitizePdfText)],
        body: (section.table.rows || []).map(row => row.map(sanitizePdfText)),
        theme: 'grid', styles: { font: 'helvetica', fontSize: document.orientation === 'landscape' ? 7 : 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [20, 55, 92], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 250] },
        columnStyles: section.table.columnStyles || {},
        didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); },
      });
      y = pdf.lastAutoTable.finalY + 7;
    }
  });

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(210, 215, 220);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 108, 116);
    pdf.text('KSP MADHUKAR Dashboard | Confidential - Official Use Only', margin, pageHeight - 8);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  pdf.save(filename);
};

export const downloadJpegSummary = (filename, title, lines = []) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext('2d');
  context.fillStyle = '#101820';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = 'bold 34px sans-serif';
  context.fillText(title, 55, 70);
  context.font = '22px sans-serif';
  lines.slice(0, 18).forEach((line, index) => context.fillText(String(line ?? ''), 55, 125 + index * 31));
  canvas.toBlob(blob => {
    if (blob) triggerDownload(filename, blob);
  }, 'image/jpeg', 0.92);
};
