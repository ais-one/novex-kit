import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// biome-ignore lint/suspicious/noExplicitAny: pdfkit has no types
let PDFDocument: any;
try {
  const mod = await import('pdfkit');
  PDFDocument = mod.default || mod;
} catch {
  PDFDocument = null;
}

const OUTPUT_DIR = join(process.cwd(), 'generated-pdfs');

function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
}

export interface RefundPdfData {
  refundRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNumber: string;
  productName: string;
  productPrice: number;
  refundAmount: number;
  reason: string;
}

export async function generateRefundPdf(data: RefundPdfData): Promise<string> {
  if (!PDFDocument) throw new Error('pdfkit not installed');

  ensureOutputDir();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const streamDone = new Promise<void>(resolve => doc.on('end', resolve));

  // Header
  doc.font('Helvetica-Bold').fontSize(24).text('Minerva Inc.', { align: 'center' });
  doc.moveDown(0.2);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666666')
    .text('Jl. Sudirman Kav. 52-53, Jakarta Selatan 12190, Indonesia', { align: 'center' })
    .text('www.minervainc.id | merch@minervainc.id | +62 812-3456-7890', { align: 'center' });
  doc.moveDown(0.5);

  // Divider
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // Title
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text('REFUND CONFIRMATION', { align: 'center' });
  doc.moveDown(0.5);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666666')
    .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      align: 'center',
    });
  doc.moveDown(1.5);

  // Refund Details Box
  doc.rect(50, doc.y, 495, 30).fill('#f0f0f0');
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text('REFUND DETAILS', 60, doc.y + 8);
  doc.moveDown(1.5);

  const startY = doc.y;
  const leftCol = 60;
  const rightCol = 300;

  const row = (label: string, value: string, y: number) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text(label, leftCol, y);
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(value, rightCol, y);
  };

  row('Refund Reference:', data.refundRef, startY);
  row('Customer Name:', data.customerName, startY + 20);
  row('Email:', data.customerEmail, startY + 40);
  row('Phone:', data.customerPhone, startY + 60);
  doc.moveDown(5);

  // Product Details
  doc.rect(50, doc.y, 495, 30).fill('#f0f0f0');
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000000')
    .text('PRODUCT DETAILS', 60, doc.y + 8);
  doc.moveDown(1.5);

  const prodY = doc.y;
  row('Order Number:', data.orderNumber, prodY);
  row('Product:', data.productName, prodY + 20);
  row('Original Price:', `$${data.productPrice.toFixed(2)}`, prodY + 40);
  row('Refund Rate:', '80%', prodY + 60);
  doc.moveDown(5);

  // Refund Amount Box
  doc.rect(50, doc.y, 495, 50).fill('#e8f5e9');
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#2e7d32')
    .text(`REFUND AMOUNT: $${data.refundAmount.toFixed(2)}`, 60, doc.y + 15, { align: 'center' });
  doc.moveDown(3);

  // Reason
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333').text('Reason for Refund:', leftCol);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#000000')
    .text(data.reason, leftCol, doc.y + 2, { width: 435 });
  doc.moveDown(2);

  // Footer
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#999999')
    .text('This refund confirmation is generated automatically by Minerva Inc. Customer Service Bot.', {
      align: 'center',
    })
    .text('Refunds are processed within 5–7 business days after item receipt.', { align: 'center' })
    .text('For inquiries, contact merch@minervainc.id or WhatsApp +62 812-3456-7890', { align: 'center' });

  doc.end();
  await streamDone;

  const buffer = Buffer.concat(buffers);
  if (buffer.length === 0) {
    throw new Error('PDF generation produced empty buffer');
  }

  const filename = `refund-${data.refundRef}.pdf`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, buffer);
  return filepath;
}
