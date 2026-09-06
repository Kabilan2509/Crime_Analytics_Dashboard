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

let kspEmblemCache = null;
export const getKspEmblemBase64 = () => {
  if (kspEmblemCache) return Promise.resolve(kspEmblemCache);
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 100;
          canvas.height = img.naturalHeight || 100;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          kspEmblemCache = canvas.toDataURL('image/png');
          resolve(kspEmblemCache);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = `${process.env.PUBLIC_URL || ''}/ksp-emblem.png`;
    } catch (e) {
      resolve(null);
    }
  });
};

export const downloadPdf = async (filename, title, content = []) => {
  const emblemBase64 = await getKspEmblemBase64();
  const document = Array.isArray(content) ? { paragraphs: content } : (content || {});
  const pdf = new jsPDF({ orientation: document.orientation || 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const safeTitle = sanitizePdfText(title) || 'KSP Official Crime Intelligence Report';

  const drawHeader = () => {
    // Official Police Navy header bar
    pdf.setFillColor(0, 33, 71);
    pdf.rect(0, 0, pageWidth, 25, 'F');

    // Karnataka State Gold accent stripe
    pdf.setFillColor(218, 165, 32);
    pdf.rect(0, 25, pageWidth, 1.8, 'F');

    let textStartX = margin;
    if (emblemBase64) {
      try {
        pdf.addImage(emblemBase64, 'PNG', margin, 2.5, 20, 20);
        textStartX = margin + 24;
      } catch (e) {
        textStartX = margin;
      }
    }

    // Official Bilingual English/State header
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('KARNATAKA STATE POLICE', textStartX, 9);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(218, 165, 32);
    pdf.text('GOVERNMENT OF KARNATAKA | STATE CRIME RECORDS BUREAU', textStartX, 15);

    pdf.setFontSize(6.8);
    pdf.setTextColor(195, 215, 235);
    pdf.text('MADHUKAR COMMAND & ANALYTICAL INTELLIGENCE DOSSIER', textStartX, 20.5);

    // Official Security Classification Badge (Right)
    pdf.setFillColor(139, 0, 0);
    pdf.roundedRect(pageWidth - margin - 38, 4, 38, 6.5, 1, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('CONFIDENTIAL / OFFICIAL', pageWidth - margin - 19, 8.5, { align: 'center' });

    pdf.setTextColor(218, 165, 32);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text('LAW ENFORCEMENT SENSITIVE', pageWidth - margin, 15, { align: 'right' });

    pdf.setTextColor(180, 200, 220);
    pdf.setFontSize(6.5);
    pdf.text(`REF: KSP/SCRB/${new Date().getFullYear()}`, pageWidth - margin, 20.5, { align: 'right' });
  };

  const addPage = () => { pdf.addPage(); drawHeader(); return 36; };
  const ensureSpace = (y, needed = 12) => y + needed > pageHeight - 18 ? addPage() : y;

  drawHeader();

  // Document Title Block
  pdf.setTextColor(0, 33, 71);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  const titleLines = pdf.splitTextToSize(safeTitle, pageWidth - margin * 2);
  pdf.text(titleLines, margin, 36);
  let y = 36 + titleLines.length * 5.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(90, 100, 115);
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')} | SCRB Secure Command Export`, margin, y);
  y += 5.5;
  pdf.setDrawColor(218, 165, 32);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  const renderParagraphs = (lines, startY) => {
    let cursor = startY;
    (lines || []).forEach(rawLine => {
      const line = sanitizePdfText(rawLine);
      if (!line) { cursor += 2.5; return; }
      const heading = line.endsWith(':') || (line.length < 70 && line === line.toUpperCase());
      pdf.setFont('helvetica', heading ? 'bold' : 'normal');
      pdf.setFontSize(heading ? 9.5 : 8.5);
      pdf.setTextColor(heading ? 0 : 45, heading ? 33 : 55, heading ? 71 : 68);
      const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2);
      const lineHeight = heading ? 4.8 : 4.2;
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
      theme: 'plain', styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5, textColor: [45, 55, 68] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38, textColor: [0, 33, 71] } },
    });
    y = pdf.lastAutoTable.finalY + 6;
  }
  y = renderParagraphs(document.paragraphs, y);

  (document.sections || []).forEach(section => {
    y = ensureSpace(y, 14);
    if (section.heading) {
      pdf.setFillColor(235, 242, 250);
      pdf.rect(margin, y - 4, pageWidth - margin * 2, 7.5, 'F');
      pdf.setFillColor(0, 33, 71);
      pdf.rect(margin, y - 4, 3, 7.5, 'F');
      pdf.setTextColor(0, 33, 71);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(sanitizePdfText(section.heading), margin + 6, y + 1.2);
      y += 8;
    }
    y = renderParagraphs(section.paragraphs, y);
    if (section.keyValues?.length) {
      autoTable(pdf, {
        startY: y, margin: { left: margin, right: margin },
        body: section.keyValues.map(item => [sanitizePdfText(item.label), sanitizePdfText(item.value)]),
        theme: 'grid', styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, valign: 'top' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, fillColor: [246, 248, 252], textColor: [0, 33, 71] } },
        didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); },
      });
      y = pdf.lastAutoTable.finalY + 6;
    }
    if (section.table?.headers?.length) {
      autoTable(pdf, {
        startY: y, margin: { left: margin, right: margin, top: 34, bottom: 18 },
        head: [section.table.headers.map(sanitizePdfText)],
        body: (section.table.rows || []).map(row => row.map(sanitizePdfText)),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: document.orientation === 'landscape' ? 7 : 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 248, 252] },
        columnStyles: section.table.columnStyles || {},
        didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); },
      });
      y = pdf.lastAutoTable.finalY + 7;
    }
  });

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(218, 165, 32);
    pdf.setLineWidth(0.4);
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(0, 33, 71);
    pdf.text('KARNATAKA STATE POLICE | STATE CRIME RECORDS BUREAU', margin, pageHeight - 9);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(110, 120, 130);
    pdf.text('MADHUKAR Automated Crime Intelligence Platform | Official Law Enforcement Record', margin, pageHeight - 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(0, 33, 71);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
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
