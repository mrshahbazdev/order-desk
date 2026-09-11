// 4x6 inch thermal-printer-style dispatch label generator.
// Uses jsPDF for layout and JsBarcode (rendered to a <canvas>) for the
// scannable Code128 barcode that drives post-dispatch scanning.
//
// labels: [{
//   orderId, fullName, phone, addressLines: string[],
//   trackingCode, amount, items: [{ name, count }],
//   scanCode      // what the barcode should encode (defaults to orderId)
// }]
// options: { note, storeName, website, whatsapp, showWebsite, showWhatsapp }
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

const W = 288;  // 4 inch in pt
const MIN_H = 432;  // 6 inch in pt (minimum)
const M = 14;   // margin

function barcodeDataUrl(value, opts = {}) {
  if (!value) return null;
  const SCALE = 3;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, String(value), {
      format: 'CODE128',
      displayValue: false,
      height: 80 * SCALE,
      width: 2 * SCALE,
      margin: 2 * SCALE,
      ...opts
    });
    return canvas.toDataURL('image/png', 1.0);
  } catch (err) {
    console.warn('Barcode render failed', err);
    return null;
  }
}

// Calculate the total content height needed for the label.
function calculateContentHeight(doc, label, opts) {
  const { note, storeName, website, whatsapp, showWebsite, showWhatsapp } = opts;
  let y = 22;

  if (storeName) y += 14;

  const hasWebsite = showWebsite && website;
  const hasWhatsapp = showWhatsapp && whatsapp;
  if (hasWebsite || hasWhatsapp) y += 10;

  y += 14; // header divider space
  y += 14; // SHIP TO header

  if (label.fullName) y += 16;
  if (label.phone) y += 14;

  (label.addressLines || []).forEach(line => {
    const wrapped = doc.splitTextToSize(String(line), W - M * 2);
    y += wrapped.length * 13;
  });

  y = Math.max(y + 4, 150);
  y += 12; // divider space
  y += 14; // ORDER DETAILS header

  if (label.orderId) y += 14;
  if (label.trackingCode) y += 13;
  if (label.amount) y += 13;

  if ((label.items || []).length) {
    y += 4 + 10 + 12; // divider + ITEMS header
    label.items.forEach(it => {
      const line = `${it.name}  ×  ${it.count}`;
      const wrapped = doc.splitTextToSize(line, W - M * 2);
      y += wrapped.length * 12;
    });
  }

  // Barcode section needs ~90pt
  y += 90;

  // Footer section needs ~56pt
  y += 56;

  // Note lines
  if (note) {
    const wrapped = doc.splitTextToSize(String(note), W - M * 2);
    y += Math.min(wrapped.length, 2) * 10;
  }

  return y;
}

function drawLabel(doc, label, opts = {}) {
  const { note, storeName, website, whatsapp, showWebsite, showWhatsapp } = opts;
  const scanCode = label.scanCode || label.trackingCode || label.orderId || '';
  const hasWebsite = showWebsite && website;
  const hasWhatsapp = showWhatsapp && whatsapp;

  const pageH = doc.internal.pageSize.getHeight();

  // ── Outer border (double-line effect) ──
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(1.5);
  doc.rect(4, 4, W - 8, pageH - 8);
  doc.setLineWidth(0.4);
  doc.rect(7, 7, W - 14, pageH - 14);

  // ── Header / Store name ──
  let y = 22;
  const name = storeName || '';
  if (name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(name.toUpperCase(), W / 2, y, { align: 'center' });
    y += 14;
  }

  // Store contact line(s) under header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const contactParts = [];
  if (hasWebsite) contactParts.push(website);
  if (hasWhatsapp) contactParts.push(`WhatsApp: ${whatsapp}`);
  if (contactParts.length) {
    doc.text(contactParts.join('  |  '), W / 2, y, { align: 'center' });
    y += 10;
  }

  // Header divider (thick)
  doc.setLineWidth(1.2);
  doc.setDrawColor(30, 30, 30);
  doc.line(M, y, W - M, y);
  y += 14;

  // ── SHIP TO section ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('SHIP TO', M, y);
  doc.setTextColor(0, 0, 0);
  y += 14;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  if (label.fullName) { doc.text(String(label.fullName), M, y); y += 16; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if (label.phone) { doc.text(String(label.phone), M, y); y += 14; }

  doc.setFontSize(10);
  (label.addressLines || []).forEach(line => {
    const wrapped = doc.splitTextToSize(String(line), W - M * 2);
    wrapped.forEach(l => { doc.text(l, M, y); y += 13; });
  });

  // ── Thin divider ──
  y = Math.max(y + 4, 150);
  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(M, y, W - M, y);
  y += 12;

  // ── Order details (two-column style) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('ORDER DETAILS', M, y);
  doc.setTextColor(0, 0, 0);
  y += 14;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (label.orderId) {
    doc.text(`Order ${label.orderId}`, M, y);
    y += 14;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (label.trackingCode) { doc.text(`AWB: ${label.trackingCode}`, M, y); y += 13; }
  if (label.amount) {
    doc.setFont('helvetica', 'bold');
    doc.text(`COD: ${label.amount}`, M, y);
    doc.setFont('helvetica', 'normal');
    y += 13;
  }

  // ── Items ──
  if ((label.items || []).length) {
    y += 4;
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.line(M, y, W - M, y);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('ITEMS', M, y);
    doc.setTextColor(0, 0, 0);
    y += 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    label.items.forEach(it => {
      const line = `${it.name}  ×  ${it.count}`;
      const wrapped = doc.splitTextToSize(line, W - M * 2);
      wrapped.forEach(l => { doc.text(l, M + 4, y); y += 12; });
    });
  }

  // ── Barcode section (positioned dynamically after content) ──
  y += 12;
  doc.setLineWidth(0.8);
  doc.setDrawColor(30, 30, 30);
  doc.line(M, y, W - M, y);
  y += 8;

  const url = barcodeDataUrl(scanCode);
  if (url) {
    const bw = 200;
    const bh = 58;
    doc.addImage(url, 'PNG', (W - bw) / 2, y, bw, bh);
    y += bh + 8;
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(String(scanCode), W / 2, y + 26, { align: 'center' });
    y += 40;
  }

  // ── Footer strip ──
  y += 8;
  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(M, y, W - M, y);

  let fy = y + 12;
  doc.setFontSize(8);

  // Admin note
  if (note) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const wrapped = doc.splitTextToSize(String(note), W - M * 2);
    wrapped.slice(0, 2).forEach(l => { doc.text(l, W / 2, fy, { align: 'center' }); fy += 10; });
  }

  // Footer contact info
  const footerParts = [];
  if (hasWebsite) footerParts.push(website);
  if (hasWhatsapp) footerParts.push(`WhatsApp: ${whatsapp}`);
  if (footerParts.length) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(footerParts.join('  |  '), W / 2, fy, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
}

export function generateLabelsPdf(labels, options = {}) {
  if (!labels?.length) return;

  // Pre-calculate heights for all labels (need a temp doc for text measurement)
  const measureDoc = new jsPDF({ unit: 'pt', format: [W, MIN_H], orientation: 'portrait' });
  const heights = labels.map(label => {
    const needed = calculateContentHeight(measureDoc, label, options);
    return Math.max(MIN_H, needed + 20); // 20pt extra padding
  });

  // Create real doc with first label's height
  const doc = new jsPDF({ unit: 'pt', format: [W, heights[0]], orientation: 'portrait' });
  labels.forEach((label, idx) => {
    if (idx > 0) doc.addPage([W, heights[idx]], 'portrait');
    drawLabel(doc, label, options);
  });
  const name = options.filename
    || (labels.length === 1
      ? `label-${labels[0].orderId || Date.now()}.pdf`
      : `labels-${labels.length}-${new Date().toISOString().slice(0, 10)}.pdf`);
  doc.save(name);
}
