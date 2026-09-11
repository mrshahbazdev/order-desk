import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function safe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '';
  return String(val);
}

/**
 * Export a tabular report to PDF.
 *
 * @param {object} opts
 * @param {string} opts.title            Big title at top of page.
 * @param {string} [opts.subtitle]       Small line under the title.
 * @param {string[]|object[]} [opts.meta]
 *   Optional key/value pairs shown above the table, e.g.
 *   [{ label: 'From', value: '2025-01-01' }, ...]. Strings are printed as-is.
 * @param {string[]} opts.columns        Column headers.
 * @param {Array<Array<string|number>>} opts.rows  Body rows.
 * @param {Array<string|number>} [opts.footer]
 *   Optional totals/footer row printed with bold styling.
 * @param {string} [opts.filename]       Defaults to title-slug + date.
 * @param {'portrait'|'landscape'} [opts.orientation='portrait']
 */
export function exportTableToPdf({
  title,
  subtitle = '',
  meta = [],
  columns,
  rows,
  footer,
  filename,
  orientation = 'portrait'
}) {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title || 'Report', 40, 40);

  let y = 40;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(subtitle, 40, 58);
    doc.setTextColor(0);
    y = 58;
  }

  const generatedAt = new Date().toLocaleString();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 40, { align: 'right' });
  doc.setTextColor(0);

  if (meta && meta.length) {
    y += 18;
    doc.setFontSize(10);
    const parts = meta
      .map(m => (typeof m === 'string' ? m : `${m.label}: ${safe(m.value)}`))
      .filter(Boolean);
    // Wrap long meta into multiple lines
    const wrapped = doc.splitTextToSize(parts.join('   •   '), pageWidth - 80);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 12;
  }

  const body = (rows || []).map(r => r.map(safe));

  autoTable(doc, {
    head: [columns],
    body,
    foot: footer ? [footer.map(safe)] : undefined,
    startY: y + 10,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [33, 99, 232], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageNumber = data.pageNumber;
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Page ${pageNumber} / ${pageCount}`, pageWidth - 40, h - 20, { align: 'right' });
      doc.setTextColor(0);
    }
  });

  const slug = (title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  doc.save(filename || `${slug}-${date}.pdf`);
}

/**
 * Convenience helper: export several tables (sections) to a single PDF.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {Array<{label:string,value:*}|string>} [opts.meta]
 * @param {Array<{
 *   heading?: string,
 *   columns: string[],
 *   rows: Array<Array<string|number>>,
 *   footer?: Array<string|number>
 * }>} opts.sections
 * @param {string} [opts.filename]
 * @param {'portrait'|'landscape'} [opts.orientation='portrait']
 */
export function exportSectionsToPdf({
  title,
  subtitle = '',
  meta = [],
  sections,
  filename,
  orientation = 'portrait'
}) {
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title || 'Report', 40, 40);

  let y = 40;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(subtitle, 40, 58);
    doc.setTextColor(0);
    y = 58;
  }

  const generatedAt = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 40, { align: 'right' });
  doc.setTextColor(0);

  if (meta && meta.length) {
    y += 18;
    doc.setFontSize(10);
    const parts = meta
      .map(m => (typeof m === 'string' ? m : `${m.label}: ${safe(m.value)}`))
      .filter(Boolean);
    const wrapped = doc.splitTextToSize(parts.join('   •   '), pageWidth - 80);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 12;
  }

  let cursorY = y + 10;
  sections.forEach((section, idx) => {
    if (section.heading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(section.heading, 40, cursorY + 14);
      cursorY += 18;
    }
    autoTable(doc, {
      head: [section.columns],
      body: (section.rows || []).map(r => r.map(safe)),
      foot: section.footer ? [section.footer.map(safe)] : undefined,
      startY: cursorY + 6,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [33, 99, 232], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        const pageNumber = data.pageNumber;
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text(`Page ${pageNumber} / ${pageCount}`, pageWidth - 40, h - 20, { align: 'right' });
        doc.setTextColor(0);
      }
    });
    cursorY = doc.lastAutoTable.finalY + 12;
    if (idx < sections.length - 1 && cursorY > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      cursorY = 40;
    }
  });

  const slug = (title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  doc.save(filename || `${slug}-${date}.pdf`);
}

export default exportTableToPdf;
