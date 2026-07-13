import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ─── JSON Export ──────────────────────────────────────────────────────────────

export async function downloadJSON(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Partager les données JSON' });
  } else {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  return /[",\r\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map(row => row.map(csvEscape).join(';'));
  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  const csv = '﻿' + lines.join('\r\n');

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Partager le fichier CSV' });
  } else {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

interface PDFSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export async function downloadPDF(reportTitle: string, sections: PDFSection[], subtitle?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN  = 14;
  const COL_W   = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  // Header
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Mon Troupeau', MARGIN, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle, MARGIN, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, MARGIN, 26);
  }
  y = 36;

  doc.setTextColor(31, 41, 55);

  for (const section of sections) {
    if (y > 260) { doc.addPage(); y = MARGIN; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(section.title, MARGIN, y);
    y += 6;

    doc.setFillColor(240, 253, 244);
    doc.rect(MARGIN, y, COL_W, 7, 'F');
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const colW = COL_W / section.headers.length;
    section.headers.forEach((h, i) => doc.text(h, MARGIN + i * colW + 2, y + 5));
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    section.rows.forEach((row, ri) => {
      if (y > 272) { doc.addPage(); y = MARGIN; }
      if (ri % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(MARGIN, y, COL_W, 6, 'F');
      }
      row.forEach((cell, i) => {
        doc.text(String(cell ?? ''), MARGIN + i * colW + 2, y + 4.5);
      });
      y += 6;
    });
    y += 6;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — Page ${p}/${pages}`, MARGIN, 290);
  }

  const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1];
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Partager le rapport PDF' });
  } else {
    doc.save(filename);
  }
}

// ─── Reçu de vente individuel ──────────────────────────────────────────────────

export interface SaleReceiptData {
  id?: number;
  date: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  buyerName?: string;
  paymentMethodLabel: string;
  notes?: string;
}

export async function downloadSaleReceipt(sale: SaleReceiptData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 12;
  const COL_W  = PAGE_W - MARGIN * 2;
  let y = 0;

  // En-tête
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, PAGE_W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Mon Troupeau', MARGIN, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reçu de vente${sale.id ? ` n°${sale.id}` : ''}`, MARGIN, 20);
  y = 36;

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.text(`Date : ${new Date(sale.date).toLocaleDateString('fr-FR')}`, MARGIN, y);
  y += 6;
  doc.text(`Client : ${sale.buyerName || '—'}`, MARGIN, y);
  y += 10;

  // Tableau de la ligne vendue
  doc.setFillColor(240, 253, 244);
  doc.rect(MARGIN, y, COL_W, 8, 'F');
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', MARGIN + 2, y + 5.5);
  doc.text('Qté', MARGIN + COL_W * 0.5, y + 5.5);
  doc.text('P.U (FCFA)', MARGIN + COL_W * 0.65, y + 5.5);
  doc.text('Montant (FCFA)', MARGIN + COL_W * 0.82, y + 5.5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.text(sale.description, MARGIN + 2, y);
  doc.text(String(sale.quantity), MARGIN + COL_W * 0.5, y);
  doc.text(sale.unitPrice.toLocaleString('fr-FR'), MARGIN + COL_W * 0.65, y);
  doc.text(sale.amount.toLocaleString('fr-FR'), MARGIN + COL_W * 0.82, y);
  y += 4;
  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, y, MARGIN + COL_W, y);
  y += 10;

  // Total
  doc.setFillColor(22, 163, 74);
  doc.rect(MARGIN, y, COL_W, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', MARGIN + 4, y + 8);
  doc.text(`${sale.amount.toLocaleString('fr-FR')} FCFA`, MARGIN + COL_W - 4, y + 8, { align: 'right' });
  y += 20;

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Mode de paiement : ${sale.paymentMethodLabel}`, MARGIN, y);
  y += 8;

  if (sale.notes) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Observation : ${sale.notes}`, MARGIN, y, { maxWidth: COL_W });
    y += 8;
  }

  // Pied de page
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Merci de votre confiance.', MARGIN, doc.internal.pageSize.getHeight() - 16);
  doc.setFontSize(7);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, MARGIN, doc.internal.pageSize.getHeight() - 10);

  const filename = `recu-vente${sale.id ? `-${sale.id}` : ''}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1];
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
    await Share.share({ title: filename, url: uri, dialogTitle: 'Partager le reçu' });
  } else {
    doc.save(filename);
  }
}
