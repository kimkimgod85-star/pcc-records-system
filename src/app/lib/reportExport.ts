import { summarize, type ReportRecord } from './reports';
import { formatISODate } from './scheduling';

export type ReportKind = 'full' | 'requests' | 'payments' | 'students';
export type PaperSize = 'letter' | 'legal' | 'a4';
export type Orientation = 'portrait' | 'landscape';
export type ExportFormat = 'pdf' | 'docx';

type Align = 'left' | 'center' | 'right';

export interface ReportTable {
  heading: string;
  note?: string;
  columns: string[];
  rows: string[][];
  align: Align[];
  weights: number[];
  total?: string[];
}

export interface ReportModel {
  title: string;
  period: string;
  generatedAt: string;
  preparedBy: string;
  summary: [string, string][];
  tables: ReportTable[];
}

export const REPORT_KINDS: { value: ReportKind; label: string; description: string }[] = [
  { value: 'full', label: 'Full period report', description: 'Totals, status, documents, monthly figures, and the request list.' },
  { value: 'requests', label: 'Request list', description: 'Every request in the period with student, document, status, and fee.' },
  { value: 'payments', label: 'Collected fees', description: 'Verified payments only, with the total collected.' },
  { value: 'students', label: 'Students served', description: 'One line per student with their request count and fees paid.' },
];

export const PAPER_SIZES: { value: PaperSize; label: string; detail: string }[] = [
  { value: 'letter', label: 'Letter', detail: '8.5 × 11 in' },
  { value: 'legal', label: 'Legal', detail: '8.5 × 14 in' },
  { value: 'a4', label: 'A4', detail: '210 × 297 mm' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  processing: 'Being prepared',
  ready: 'Ready for pickup',
  completed: 'Claimed',
  rejected: 'Rejected',
};

const KIND_TITLE: Record<ReportKind, string> = {
  full: 'Document Request Report',
  requests: 'Document Request List',
  payments: 'Collected Fees Report',
  students: 'Students Served Report',
};

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%');

export function buildReportModel(input: {
  kind: ReportKind;
  records: ReportRecord[];
  period: string;
  preparedBy: string;
  currency: string;
}): ReportModel {
  const { kind, period, preparedBy, currency } = input;
  const records = input.records.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const stats = summarize(records);
  const money = (value: number) =>
    `${currency}${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const generatedAt = new Date().toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const tables: ReportTable[] = [];
  let summary: [string, string][] = [];

  const requestList = (): ReportTable => ({
    heading: 'Request list',
    note: records.length ? undefined : 'No requests in this period.',
    columns: ['#', 'Request ID', 'Date', 'Student', 'Student ID', 'Document', 'Status', 'Fee', 'Payment'],
    align: ['center', 'left', 'left', 'left', 'left', 'left', 'left', 'right', 'center'],
    weights: [4, 12, 11, 16, 10, 17, 11, 9, 8],
    rows: records.map((item, i) => [
      String(i + 1),
      item.id,
      formatISODate(item.date),
      item.student,
      item.studentId,
      item.documentType,
      STATUS_LABEL[item.status] || item.status,
      money(item.amount),
      item.paid ? 'Paid' : 'Unpaid',
    ]),
    total: records.length
      ? ['', '', '', '', '', '', 'Total', money(records.reduce((sum, item) => sum + item.amount, 0)), '']
      : undefined,
  });

  if (kind === 'full' || kind === 'requests') {
    summary = [
      ['Requests submitted', String(stats.total)],
      ['Claimed', `${stats.completed} (${stats.completionRate}%)`],
      ['Still in process', String(stats.inProcess)],
      ['Rejected', String(stats.rejected)],
      ['Rush requests', String(stats.rush)],
      ['Students served', String(stats.students)],
      ['Fees collected', money(stats.collected)],
      ['Unpaid fees', money(stats.unpaid)],
    ];
  }

  if (kind === 'full') {
    tables.push({
      heading: 'Requests by status',
      columns: ['Status', 'Requests', 'Share'],
      align: ['left', 'right', 'right'],
      weights: [60, 20, 20],
      rows: Object.entries(stats.byStatus).map(([status, count]) => [STATUS_LABEL[status], String(count), pct(count, stats.total)]),
      total: ['Total', String(stats.total), stats.total ? '100%' : '0%'],
    });
    tables.push({
      heading: 'Requests by document',
      columns: ['Document', 'Requests', 'Share', 'Fees collected'],
      align: ['left', 'right', 'right', 'right'],
      weights: [46, 16, 14, 24],
      rows: stats.byDocument.map(doc => [doc.type, String(doc.count), `${doc.pct}%`, money(doc.revenue)]),
      total: ['Total', String(stats.total), stats.total ? '100%' : '0%', money(stats.collected)],
    });
    tables.push({
      heading: 'Monthly summary',
      note: stats.byMonth.length ? undefined : 'No requests in this period.',
      columns: ['Month', 'Submitted', 'Claimed', 'Rejected', 'Fees collected'],
      align: ['left', 'right', 'right', 'right', 'right'],
      weights: [28, 16, 16, 16, 24],
      rows: stats.byMonth.map(m => [m.month, String(m.submitted), String(m.completed), String(m.rejected), money(m.revenue)]),
      total: stats.byMonth.length
        ? ['Total', String(stats.total), String(stats.completed), String(stats.rejected), money(stats.collected)]
        : undefined,
    });
    tables.push(requestList());
  }

  if (kind === 'requests') tables.push(requestList());

  if (kind === 'payments') {
    const paid = records.filter(item => item.paid);
    const collected = paid.reduce((sum, item) => sum + item.amount, 0);
    summary = [
      ['Paid requests', String(paid.length)],
      ['Total collected', money(collected)],
      ['Unpaid requests', String(records.filter(item => !item.paid && item.status !== 'rejected').length)],
      ['Unpaid fees', money(stats.unpaid)],
    ];
    tables.push({
      heading: 'Verified payments',
      note: paid.length ? undefined : 'No verified payments in this period.',
      columns: ['#', 'Date', 'Request ID', 'Student', 'Student ID', 'Document', 'Amount'],
      align: ['center', 'left', 'left', 'left', 'left', 'left', 'right'],
      weights: [5, 13, 14, 20, 12, 22, 14],
      rows: paid.map((item, i) => [
        String(i + 1),
        formatISODate(item.date),
        item.id,
        item.student,
        item.studentId,
        item.documentType,
        money(item.amount),
      ]),
      total: paid.length ? ['', '', '', '', '', 'Total collected', money(collected)] : undefined,
    });
  }

  if (kind === 'students') {
    const byStudent = new Map<string, { id: string; name: string; requests: number; claimed: number; paid: number }>();
    for (const item of records) {
      const key = item.studentId || item.student;
      const row = byStudent.get(key) || { id: item.studentId, name: item.student, requests: 0, claimed: 0, paid: 0 };
      row.requests += 1;
      if (item.status === 'completed') row.claimed += 1;
      if (item.paid) row.paid += item.amount;
      byStudent.set(key, row);
    }
    const list = Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name));
    summary = [
      ['Students served', String(list.length)],
      ['Requests submitted', String(stats.total)],
      ['Claimed', String(stats.completed)],
      ['Fees collected', money(stats.collected)],
    ];
    tables.push({
      heading: 'Students served',
      note: list.length ? undefined : 'No students served in this period.',
      columns: ['#', 'Student ID', 'Student name', 'Requests', 'Claimed', 'Fees paid'],
      align: ['center', 'left', 'left', 'right', 'right', 'right'],
      weights: [6, 18, 36, 12, 12, 16],
      rows: list.map((s, i) => [String(i + 1), s.id, s.name, String(s.requests), String(s.claimed), money(s.paid)]),
      total: list.length
        ? ['', '', 'Total', String(stats.total), String(stats.completed), money(list.reduce((sum, s) => sum + s.paid, 0))]
        : undefined,
    });
  }

  return { title: KIND_TITLE[kind], period, generatedAt, preparedBy, summary, tables };
}

/* ---------- shared assets ---------- */

const SCHOOL = 'PAGADIAN CAPITOL COLLEGES';
const OFFICE = 'Office of the Registrar';
const SYSTEM = 'Web-Based School Records Request & Scheduling System';
const LOGO_URL = '/PCC%20LOGO.png';

type Logo = { dataUrl: string; bytes: ArrayBuffer; ratio: number } | null;

async function loadLogo(): Promise<Logo> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bytes = await blob.arrayBuffer();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1);
      img.onerror = () => resolve(1);
      img.src = dataUrl;
    });
    return { dataUrl, bytes, ratio };
  } catch {
    return null;
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- PDF ---------- */

export async function exportReportPdf(model: ReportModel, paper: PaperSize, orientation: Orientation, filename: string) {
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([import('jspdf'), import('jspdf-autotable'), loadLogo()]);
  const doc = new jsPDF({ unit: 'pt', format: paper, orientation });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentW = pageW - margin * 2;
  const blue: [number, number, number] = [30, 64, 175];
  const dark: [number, number, number] = [17, 24, 39];
  const gray: [number, number, number] = [107, 114, 128];
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? margin;

  // Letterhead
  let y = margin;
  const logoSize = 50;
  if (logo) doc.addImage(logo.dataUrl, 'PNG', margin, y, logoSize, logoSize * logo.ratio);
  const textX = logo ? margin + logoSize + 14 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...blue);
  doc.text(SCHOOL, textX, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...dark);
  doc.text(OFFICE, textX, y + 31);
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text(SYSTEM, textX, y + 44);
  y += Math.max(logoSize * (logo?.ratio ?? 1), 50) + 10;
  doc.setDrawColor(...blue);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 3, pageW - margin, y + 3);
  y += 26;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.text(model.title.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(model.period.replace(/\s*[•·]\s*/g, '  |  '), pageW / 2, y, { align: 'center', maxWidth: contentW });
  y += 14;
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text(`Generated ${model.generatedAt}`, pageW / 2, y, { align: 'center' });
  y += 20;

  const sectionHeading = (text: string) => {
    if (y > pageH - margin - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...blue);
    doc.text(text, margin, y);
    y += 8;
  };

  // Summary
  if (model.summary.length) {
    sectionHeading('Summary');
    const pairs: string[][] = [];
    for (let i = 0; i < model.summary.length; i += 2) {
      const a = model.summary[i];
      const b = model.summary[i + 1];
      pairs.push([a[0], a[1], b?.[0] ?? '', b?.[1] ?? '']);
    }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: pairs,
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, lineColor: [209, 213, 219], lineWidth: 0.5, textColor: dark },
      columnStyles: {
        0: { fillColor: [243, 244, 246], textColor: gray, cellWidth: contentW * 0.28 },
        1: { fontStyle: 'bold', halign: 'right', cellWidth: contentW * 0.22 },
        2: { fillColor: [243, 244, 246], textColor: gray, cellWidth: contentW * 0.28 },
        3: { fontStyle: 'bold', halign: 'right', cellWidth: contentW * 0.22 },
      },
    });
    y = lastY() + 22;
  }

  // Tables
  for (const table of model.tables) {
    sectionHeading(table.heading);
    if (table.note && table.rows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...gray);
      doc.text(table.note, margin, y + 8);
      y += 30;
      continue;
    }
    const weightSum = table.weights.reduce((a, b) => a + b, 0);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, top: margin, bottom: margin + 10 },
      theme: 'grid',
      head: [table.columns],
      body: table.rows,
      foot: table.total ? [table.total] : undefined,
      showFoot: 'lastPage',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
        lineColor: [209, 213, 219],
        lineWidth: 0.5,
        textColor: dark,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      footStyles: { fillColor: [229, 231, 235], textColor: dark, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(
        table.align.map((halign, i) => [i, { halign, cellWidth: (contentW * table.weights[i]) / weightSum }]),
      ),
      didParseCell: data => {
        data.cell.styles.halign = table.align[data.column.index];
      },
    });
    y = lastY() + 22;
  }

  // Signatures
  if (y > pageH - margin - 110) {
    doc.addPage();
    y = margin + 10;
  }
  y += 10;
  const colW = (contentW - 40) / 2;
  const sign = (x: number, label: string, name: string, role: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...gray);
    doc.text(label, x, y);
    doc.setDrawColor(...dark);
    doc.setLineWidth(0.6);
    doc.line(x, y + 42, x + colW, y + 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    if (name) doc.text(name, x + colW / 2, y + 38, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(role, x + colW / 2, y + 55, { align: 'center' });
  };
  sign(margin, 'Prepared by:', model.preparedBy, 'Registrar’s Office Staff');
  sign(margin + colW + 40, 'Noted by:', '', 'College Registrar');

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - margin + 12, pageW - margin, pageH - margin + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`${SCHOOL} · ${model.title}`, margin, pageH - margin + 26);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - margin + 26, { align: 'right' });
  }

  doc.save(filename);
}

/* ---------- Word (.docx) ---------- */

const TWIPS: Record<PaperSize, { width: number; height: number }> = {
  letter: { width: 12240, height: 15840 },
  legal: { width: 12240, height: 20160 },
  a4: { width: 11906, height: 16838 },
};

export async function exportReportDocx(model: ReportModel, paper: PaperSize, orientation: Orientation, filename: string) {
  const [docx, logo] = await Promise.all([import('docx'), loadLogo()]);
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
    BorderStyle, ShadingType, ImageRun, Footer, PageNumber, PageOrientation, TabStopType,
    TableLayoutType, VerticalAlign,
  } = docx;

  const margin = 1080;
  const size = TWIPS[paper];
  const pageWidth = orientation === 'landscape' ? size.height : size.width;
  const contentW = pageWidth - margin * 2;
  const font = 'Calibri';
  const BLUE = '1E40AF';
  const DARK = '111827';
  const GRAY = '6B7280';
  const LINE = 'D1D5DB';

  const align = (a: Align) => (a === 'right' ? AlignmentType.RIGHT : a === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT);
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const gridBorders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };

  const text = (value: string, opts: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) =>
    new TextRun({ text: value, font, bold: opts.bold, italics: opts.italics, color: opts.color ?? DARK, size: opts.size ?? 19 });

  const cell = (value: string, width: number, opts: { align?: Align; bold?: boolean; fill?: string; color?: string; size?: number } = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 70, bottom: 70, left: 100, right: 100 },
      shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
      children: [new Paragraph({
        alignment: align(opts.align ?? 'left'),
        children: [text(value, { bold: opts.bold, color: opts.color, size: opts.size ?? 18 })],
      })],
    });

  const heading = (value: string) =>
    new Paragraph({ spacing: { before: 300, after: 120 }, children: [text(value, { bold: true, color: BLUE, size: 23 })] });

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  // Letterhead
  const logoW = 62;
  const letterText = [
    new Paragraph({ children: [text(SCHOOL, { bold: true, color: BLUE, size: 30 })] }),
    new Paragraph({ children: [text(OFFICE, { size: 22 })] }),
    new Paragraph({ children: [text(SYSTEM, { color: GRAY, size: 17 })] }),
  ];
  const logoCol = 1300;
  children.push(new Table({
    width: { size: contentW, type: WidthType.DXA },
    columnWidths: logo ? [logoCol, contentW - logoCol] : [contentW],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [new TableRow({
      children: [
        ...(logo ? [new TableCell({
          width: { size: logoCol, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: noBorders,
          children: [new Paragraph({
            children: [new ImageRun({ type: 'png', data: logo.bytes, transformation: { width: logoW, height: Math.round(logoW * logo.ratio) } })],
          })],
        })] : []),
        new TableCell({
          width: { size: logo ? contentW - logoCol : contentW, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: noBorders,
          children: letterText,
        }),
      ],
    })],
  }));
  children.push(new Paragraph({
    spacing: { before: 120, after: 280 },
    border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: BLUE, space: 1 } },
    children: [],
  }));

  // Title
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [text(model.title.toUpperCase(), { bold: true, size: 28 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [text(model.period, { size: 21 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [text(`Generated ${model.generatedAt}`, { color: GRAY, size: 17 })] }));

  // Summary
  if (model.summary.length) {
    children.push(heading('Summary'));
    const w = [0.28, 0.22, 0.28, 0.22].map(p => Math.round(contentW * p));
    const rows = [];
    for (let i = 0; i < model.summary.length; i += 2) {
      const a = model.summary[i];
      const b = model.summary[i + 1];
      rows.push(new TableRow({
        children: [
          cell(a[0], w[0], { fill: 'F3F4F6', color: GRAY, size: 19 }),
          cell(a[1], w[1], { align: 'right', bold: true, size: 19 }),
          cell(b?.[0] ?? '', w[2], { fill: 'F3F4F6', color: GRAY, size: 19 }),
          cell(b?.[1] ?? '', w[3], { align: 'right', bold: true, size: 19 }),
        ],
      }));
    }
    children.push(new Table({ width: { size: contentW, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, borders: gridBorders, rows }));
  }

  // Tables
  for (const table of model.tables) {
    children.push(heading(table.heading));
    if (table.note && table.rows.length === 0) {
      children.push(new Paragraph({ children: [text(table.note, { italics: true, color: GRAY })] }));
      continue;
    }
    const sum = table.weights.reduce((a, b) => a + b, 0);
    const widths = table.weights.map(wt => Math.floor((contentW * wt) / sum));
    const rows = [
      new TableRow({
        tableHeader: true,
        children: table.columns.map((col, i) => cell(col, widths[i], { align: table.align[i], bold: true, fill: BLUE, color: 'FFFFFF' })),
      }),
      ...table.rows.map((row, r) => new TableRow({
        cantSplit: true,
        children: row.map((value, i) => cell(value, widths[i], { align: table.align[i], fill: r % 2 ? 'F8FAFC' : undefined })),
      })),
      ...(table.total ? [new TableRow({
        children: table.total.map((value, i) => cell(value, widths[i], { align: table.align[i], bold: true, fill: 'E5E7EB' })),
      })] : []),
    ];
    children.push(new Table({ width: { size: contentW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: gridBorders, rows }));
  }

  // Signatures
  const half = Math.floor(contentW / 2);
  const signCell = (label: string, name: string, role: string) => new TableCell({
    width: { size: half, type: WidthType.DXA },
    borders: noBorders,
    margins: { right: 400 },
    children: [
      new Paragraph({ spacing: { after: 480 }, children: [text(label, { color: GRAY })] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: DARK, space: 1 } },
        children: [text(name || ' ', { bold: true, size: 20 })],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [text(role, { color: GRAY, size: 18 })] }),
    ],
  });
  children.push(new Paragraph({ spacing: { before: 480 }, children: [] }));
  children.push(new Table({
    width: { size: contentW, type: WidthType.DXA },
    columnWidths: [half, contentW - half],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [new TableRow({
      cantSplit: true,
      children: [
        signCell('Prepared by:', model.preparedBy, 'Registrar’s Office Staff'),
        signCell('Noted by:', '', 'College Registrar'),
      ],
    })],
  }));

  const file = new Document({
    creator: 'PCC Records Request System',
    title: model.title,
    styles: { default: { document: { run: { font, size: 19 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: size.width, height: size.height, orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: { top: margin, bottom: margin, left: margin, right: margin },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: contentW }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } },
            children: [
              new TextRun({ text: `${SCHOOL} · ${model.title}`, font, size: 16, color: GRAY }),
              new TextRun({ children: ['\tPage ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font, size: 16, color: GRAY }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  saveBlob(await Packer.toBlob(file), filename);
}
