import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { UPLOADS_DIR } from './db.ts';

export interface PdfSection {
  heading: string;
  body: string[];
  code?: string;
}

export interface PdfSpec {
  filename: string;
  title: string;
  subtitle: string;
  badge: string;
  disclaimer: string;
  sections: PdfSection[];
}

export async function ensurePdfFile(spec: PdfSpec): Promise<{
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
}> {
  const filePath = path.join(UPLOADS_DIR, spec.filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      return {
        fileName: spec.filename,
        fileUrl: `/api/files/${encodeURIComponent(spec.filename)}`,
        fileSizeBytes: stats.size,
      };
    }
  }

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header bar
    doc.rect(0, 0, doc.page.width, 84).fill('#312e81');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(spec.title, 48, 22, {
      width: doc.page.width - 96,
    });
    doc.fillColor('#c7d2fe').font('Helvetica').fontSize(10).text(spec.subtitle, 48, 48, {
      width: doc.page.width - 96,
    });

    doc.y = 100;
    doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(9).text(`SOURCE CATEGORY: ${spec.badge.toUpperCase()}`);
    doc.moveDown(0.3);
    doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9).text(spec.disclaimer);
    doc.moveDown(0.8);
    doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).strokeColor('#cbd5e1').stroke();
    doc.moveDown(0.8);

    for (const sec of spec.sections) {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(sec.heading);
      doc.moveDown(0.35);

      doc.fillColor('#334155').font('Helvetica').fontSize(10.5);
      for (const para of sec.body) {
        doc.text(para, { lineGap: 3 });
        doc.moveDown(0.25);
      }

      if (sec.code) {
        doc.moveDown(0.2);
        const codeLines = sec.code.split('\n');
        const boxHeight = Math.min(260, codeLines.length * 12.5 + 16);
        if (doc.y + boxHeight > doc.page.height - 60) {
          doc.addPage();
        }
        const startY = doc.y;
        doc.roundedRect(48, startY, doc.page.width - 96, boxHeight, 4).fill('#f1f5f9');
        doc.fillColor('#0f172a').font('Courier').fontSize(8.8).text(sec.code, 56, startY + 8, {
          width: doc.page.width - 112,
        });
        doc.y = startY + boxHeight + 10;
      }

      doc.moveDown(0.6);
    }

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8.5).text(
      'Generated for KTU S3 Study Hub — Everything for your semester, in one place.',
      48,
      doc.page.height - 40,
      { align: 'center', width: doc.page.width - 96 }
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(filePath);
  return {
    fileName: spec.filename,
    fileUrl: `/api/files/${encodeURIComponent(spec.filename)}`,
    fileSizeBytes: stats.size,
  };
}
