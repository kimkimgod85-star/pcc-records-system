/** Canvas-based REQ ID slip students can save and show at the Cashier. */

export type ReqIdProofInput = {
  requestId: string;
  studentName: string;
  studentId?: string;
  documentName: string;
  amountLabel: string;
};

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

export function buildReqIdProofCanvas(input: ReqIdProofInput): HTMLCanvasElement {
  const width = 720;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create REQ ID proof.');

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#0f766e');
  g.addColorStop(0.55, '#047857');
  g.addColorStop(1, '#065f46');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(80 + i * 90, 40 + (i % 3) * 120, 70 + (i % 2) * 20, 0, Math.PI * 2);
    ctx.fill();
  }

  roundRect(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  roundRect(ctx, 36, 36, width - 72, 150, 28);
  ctx.fillStyle = '#059669';
  ctx.fill();
  ctx.fillRect(36, 120, width - 72, 66);

  ctx.fillStyle = '#ecfdf5';
  ctx.font = '600 22px Poppins, system-ui, sans-serif';
  ctx.fillText('PCC RECORDS', 68, 88);
  ctx.font = '500 16px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(236,253,245,0.9)';
  ctx.fillText('Pay in Person · Request Proof', 68, 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px Inter, system-ui, sans-serif';
  ctx.fillText('REQ ID', 68, 160);
  ctx.font = '700 34px ui-monospace, SFMono-Regular, Menlo, monospace';
  const reqId = fitText(ctx, input.requestId, width - 160, ctx.font);
  ctx.fillText(reqId, 68, 200);

  const rows: { label: string; value: string }[] = [
    { label: 'Student', value: input.studentName || 'Student' },
    ...(input.studentId ? [{ label: 'Student ID', value: input.studentId }] : []),
    { label: 'Document', value: input.documentName },
    { label: 'Amount to pay', value: input.amountLabel },
    {
      label: 'Generated',
      value: new Date().toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  ];

  let y = 260;
  for (const row of rows) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillText(row.label.toUpperCase(), 68, y);
    ctx.fillStyle = '#111827';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    const value = fitText(ctx, row.value, width - 160, ctx.font);
    ctx.fillText(value, 68, y + 34);
    y += 88;
  }

  roundRect(ctx, 68, height - 230, width - 136, 140, 18);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 2;
  roundRect(ctx, 68, height - 230, width - 136, 140, 18);
  ctx.stroke();

  ctx.fillStyle = '#065f46';
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.fillText('Show this to the Cashier', 92, height - 190);
  ctx.fillStyle = '#047857';
  ctx.font = '500 15px Inter, system-ui, sans-serif';
  const lines = [
    '1. Pay at PCC New Building Cashier',
    '2. Keep your Official Receipt',
    '3. Bring receipt + this REQ ID to Registrar',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, 92, height - 155 + i * 28);
  });

  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Official slip from PCC Records · Valid for this request only', width / 2, height - 58);
  ctx.textAlign = 'left';

  return canvas;
}

export function downloadReqIdProof(input: ReqIdProofInput) {
  const canvas = buildReqIdProofCanvas(input);
  const link = document.createElement('a');
  const safeId = input.requestId.replace(/[^\w-]+/g, '_');
  link.download = `PCC-REQ-ID-${safeId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function reqIdProofDataUrl(input: ReqIdProofInput): string {
  return buildReqIdProofCanvas(input).toDataURL('image/png');
}
