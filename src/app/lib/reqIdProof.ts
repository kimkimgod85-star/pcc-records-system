/** Canvas-based REQ ID slip students can save and show at the Cashier. */

import { withBase } from './basePath';

export type ReqIdProofInput = {
  requestId: string;
  studentName: string;
  studentId?: string;
  documentName: string;
  amountLabel: string;
};

const W = 800;
const H = 1120;
const PAD = 40;
const INNER = 28;
const CONTENT_X = PAD + INNER;
const CONTENT_W = W - (PAD + INNER) * 2;
const LABEL_W = 210;
const ROW_H = 58;
const LINE = '#cbd5e1';
const INK = '#0f172a';
const MUTED = '#64748b';
const BLUE = '#1e3a8a';
const BLUE_DEEP = '#0f172a';
const BLUE_MID = '#1e40af';
const BLUE_SOFT = '#eff6ff';
const BLUE_BORDER = '#93c5fd';

let logoPromise: Promise<HTMLImageElement | null> | null = null;

function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logoPromise) {
    logoPromise = new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = withBase('PCC%20LOGO.png');
    });
  }
  return logoPromise;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function hLine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color = LINE) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, Math.round(y) + 0.5);
  ctx.lineTo(x + w, Math.round(y) + 0.5);
  ctx.stroke();
}

export async function buildReqIdProofCanvas(input: ReqIdProofInput): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const logo = await loadLogo();
  const rows: { label: string; value: string }[] = [
    { label: 'Student name', value: input.studentName || 'Student' },
    ...(input.studentId ? [{ label: 'School ID', value: input.studentId }] : []),
    { label: 'Document', value: input.documentName },
    { label: 'Amount to pay', value: input.amountLabel },
    {
      label: 'Date generated',
      value: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    { label: 'Payment method', value: 'Pay in Person' },
  ];
  const steps = [
    'Show this form at the PCC New Building Cashier',
    'Pay the amount and keep your Official Receipt',
    'Bring the receipt and this REQ ID to the Registrar',
  ];
  const headerH = 120;
  const reqBoxH = 112;
  const stepRowH = 32;
  const stepsBoxH = 40 + steps.length * stepRowH + 14;
  const tableH = rows.length * ROW_H;
  const height = PAD + headerH + 28 + 16 + 20 + reqBoxH + 24 + tableH + 22 + stepsBoxH + 48 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create REQ ID proof.');

  // Dark blue frame
  ctx.fillStyle = BLUE_DEEP;
  ctx.fillRect(0, 0, W, height);

  roundRect(ctx, PAD, PAD, W - PAD * 2, height - PAD * 2, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  roundRect(ctx, PAD, PAD, W - PAD * 2, headerH, 16);
  ctx.fillStyle = BLUE;
  ctx.fill();
  ctx.fillRect(PAD, PAD + headerH - 24, W - PAD * 2, 24);

  const logoSize = 76;
  const logoX = CONTENT_X;
  const logoY = PAD + 28;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const titleX = logo ? logoX + logoSize + 20 : CONTENT_X;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px Poppins, system-ui, sans-serif';
  ctx.fillText('PCC RECORDS', titleX, PAD + 58);
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#bfdbfe';
  ctx.fillText('Pagadian Capitol Colleges', titleX, PAD + 84);
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('Pay in Person · Official Request Proof', titleX, PAD + 108);

  // Title
  let y = PAD + headerH + 36;
  ctx.fillStyle = INK;
  ctx.font = '700 20px Poppins, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REQUEST ID FORM', W / 2, y);
  ctx.textAlign = 'left';
  y += 18;
  hLine(ctx, CONTENT_X, y, CONTENT_W, '#94a3b8');

  y += 22;
  roundRect(ctx, CONTENT_X, y, CONTENT_W, reqBoxH, 12);
  ctx.fillStyle = BLUE_SOFT;
  ctx.fill();
  ctx.strokeStyle = BLUE_MID;
  ctx.lineWidth = 2;
  roundRect(ctx, CONTENT_X, y, CONTENT_W, reqBoxH, 12);
  ctx.stroke();

  ctx.fillStyle = BLUE_MID;
  ctx.font = '700 13px Inter, system-ui, sans-serif';
  ctx.fillText('REQUEST ID', CONTENT_X + 22, y + 32);

  const reqFont = '700 32px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = INK;
  ctx.font = reqFont;
  const reqId = fitText(ctx, input.requestId, CONTENT_W - 44, reqFont);
  ctx.fillText(reqId, CONTENT_X + 22, y + 72);

  ctx.fillStyle = MUTED;
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.fillText('Present this ID to the Cashier and Registrar', CONTENT_X + 22, y + 94);

  y += reqBoxH + 24;
  const tableTop = y;
  const colX = CONTENT_X + LABEL_W;

  ctx.save();
  roundRect(ctx, CONTENT_X, tableTop, CONTENT_W, tableH, 10);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(CONTENT_X, tableTop, CONTENT_W, tableH);
  rows.forEach((_, i) => {
    if (i % 2 === 1) {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(CONTENT_X, tableTop + i * ROW_H, CONTENT_W, ROW_H);
    }
  });
  ctx.restore();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  roundRect(ctx, CONTENT_X, tableTop, CONTENT_W, tableH, 10);
  ctx.stroke();

  for (let i = 1; i < rows.length; i++) {
    hLine(ctx, CONTENT_X, tableTop + i * ROW_H, CONTENT_W, LINE);
  }

  ctx.beginPath();
  ctx.moveTo(Math.round(colX) + 0.5, tableTop);
  ctx.lineTo(Math.round(colX) + 0.5, tableTop + tableH);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  rows.forEach((row, i) => {
    const midY = tableTop + i * ROW_H + ROW_H / 2 + 5;

    ctx.fillStyle = MUTED;
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillText(row.label, CONTENT_X + 18, midY);

    ctx.fillStyle = INK;
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    const value = fitText(ctx, row.value, CONTENT_W - LABEL_W - 36, ctx.font);
    ctx.fillText(value, colX + 18, midY);
  });

  y = tableTop + tableH + 22;
  roundRect(ctx, CONTENT_X, y, CONTENT_W, stepsBoxH, 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = BLUE_BORDER;
  ctx.lineWidth = 1.5;
  roundRect(ctx, CONTENT_X, y, CONTENT_W, stepsBoxH, 12);
  ctx.stroke();

  ctx.fillStyle = BLUE;
  ctx.font = '700 15px Inter, system-ui, sans-serif';
  ctx.fillText('Student steps', CONTENT_X + 20, y + 30);

  steps.forEach((step, i) => {
    const sy = y + 52 + i * stepRowH;
    // Number circle
    ctx.beginPath();
    ctx.arc(CONTENT_X + 30, sy - 4, 11, 0, Math.PI * 2);
    ctx.fillStyle = BLUE_MID;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), CONTENT_X + 30, sy);
    ctx.textAlign = 'left';

    ctx.fillStyle = INK;
    ctx.font = '500 14px Inter, system-ui, sans-serif';
    ctx.fillText(fitText(ctx, step, CONTENT_W - 72, ctx.font), CONTENT_X + 52, sy);
  });

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Official form from PCC Records  ·  Valid only for the request ID shown above',
    W / 2,
    height - PAD - 16,
  );
  ctx.textAlign = 'left';

  return canvas;
}

export async function downloadReqIdProof(input: ReqIdProofInput) {
  const canvas = await buildReqIdProofCanvas(input);
  const link = document.createElement('a');
  const safeId = input.requestId.replace(/[^\w-]+/g, '_');
  link.download = `PCC-REQ-ID-${safeId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function reqIdProofDataUrl(input: ReqIdProofInput): Promise<string> {
  const canvas = await buildReqIdProofCanvas(input);
  return canvas.toDataURL('image/png');
}
