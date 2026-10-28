/** Canvas-based REQ ID slip students can save and show at the Cashier. */

import { withBase } from './basePath';

export type ReqIdProofInput = {
  requestId: string;
  studentName: string;
  studentId?: string;
  documentName: string;
  amountLabel: string;
};

let logoPromise: Promise<HTMLImageElement | null> | null = null;

function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logoPromise) {
    logoPromise = new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [fitText(ctx, text, maxWidth, font)];
}

export async function buildReqIdProofCanvas(input: ReqIdProofInput): Promise<HTMLCanvasElement> {
  const width = 780;
  const height = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create REQ ID proof.');

  const logo = await loadLogo();

  // Outer frame
  ctx.fillStyle = '#0f4c3a';
  ctx.fillRect(0, 0, width, height);

  // Paper
  roundRect(ctx, 18, 18, width - 36, height - 36, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Top brand bar
  roundRect(ctx, 18, 18, width - 36, 148, 18);
  ctx.fillStyle = '#0f766e';
  ctx.fill();
  ctx.fillRect(18, 100, width - 36, 66);

  const logoSize = 88;
  const logoX = 46;
  const logoY = 40;
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
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const textLeft = logo ? logoX + logoSize + 22 : 52;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px Poppins, system-ui, sans-serif';
  ctx.fillText('PCC RECORDS', textLeft, 78);
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('Philippine College of Commerce', textLeft, 106);
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('Pay in Person · Official Request Proof', textLeft, 132);

  // Document title
  ctx.fillStyle = '#111827';
  ctx.font = '700 22px Poppins, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REQUEST ID FORM', width / 2, 210);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(52, 228);
  ctx.lineTo(width - 52, 228);
  ctx.stroke();

  // REQ ID highlight box — fully on white paper, dark text
  const boxX = 52;
  const boxY = 250;
  const boxW = width - 104;
  const boxH = 118;
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2.5;
  roundRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.stroke();

  ctx.fillStyle = '#047857';
  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillText('REQUEST ID (REQ ID)', boxX + 24, boxY + 36);
  ctx.fillStyle = '#064e3b';
  ctx.font = '700 34px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const reqFont = '700 34px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const reqId = fitText(ctx, input.requestId, boxW - 48, reqFont);
  ctx.fillText(reqId, boxX + 24, boxY + 82);
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.fillText('Show this ID to the Cashier and Registrar', boxX + 24, boxY + 104);

  // Details section
  const rows: { label: string; value: string }[] = [
    { label: 'Student name', value: input.studentName || 'Student' },
    ...(input.studentId ? [{ label: 'Student ID', value: input.studentId }] : []),
    { label: 'Document', value: input.documentName },
    { label: 'Amount to pay', value: input.amountLabel },
    {
      label: 'Date generated',
      value: new Date().toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
    { label: 'Payment method', value: 'Pay in Person (Cashier)' },
  ];

  let y = 410;
  const labelX = 56;
  const valueX = 250;
  const valueMax = width - 56 - valueX;

  for (const row of rows) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillText(row.label, labelX, y);

    ctx.fillStyle = '#111827';
    const valueFont = '600 18px Inter, system-ui, sans-serif';
    const lines = wrapText(ctx, row.value, valueMax, valueFont);
    lines.forEach((line, i) => {
      ctx.font = valueFont;
      ctx.fillText(line, valueX, y + i * 24);
    });

    const blockH = Math.max(28, lines.length * 24);
    y += blockH + 18;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, y - 10);
    ctx.lineTo(width - 52, y - 10);
    ctx.stroke();
  }

  // Instructions
  const tipY = Math.max(y + 16, height - 280);
  roundRect(ctx, 52, tipY, width - 104, 168, 14);
  ctx.fillStyle = '#f0fdf4';
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 52, tipY, width - 104, 168, 14);
  ctx.stroke();

  ctx.fillStyle = '#065f46';
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.fillText('Student steps', 76, tipY + 36);
  ctx.fillStyle = '#047857';
  ctx.font = '500 15px Inter, system-ui, sans-serif';
  const steps = [
    '1. Present this REQ ID form at the PCC New Building Cashier',
    '2. Pay the amount and keep your Official Receipt',
    '3. Bring your Official Receipt and this REQ ID to the Registrar',
    '4. Wait for the Registrar to verify your payment and documents',
  ];
  steps.forEach((step, i) => {
    ctx.fillText(step, 76, tipY + 68 + i * 26);
  });

  // Footer
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Official form from PCC Records · Valid only for the request ID shown above',
    width / 2,
    height - 48,
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
