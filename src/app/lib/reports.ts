import { fetchRequests } from './requests';
import { parseISODate, toISODate, type ProcessingUrgency } from './scheduling';
import type { TermKey } from './academicCalendar';
import {
  dateInTerm,
  loadAllCalendars,
  loadCalendar,
  monthsOverlappingRange,
  schoolYearDateSpan,
} from './academicCalendar';

export type ReportStatus = 'pending' | 'approved' | 'processing' | 'ready' | 'completed' | 'rejected';
export type SemesterKey = 'all' | '1st' | '2nd' | 'summer';

export interface ReportRecord {
  id: string;
  date: string;
  student: string;
  studentId: string;
  documentType: string;
  status: ReportStatus;
  amount: number;
  paid: boolean;
  urgency: ProcessingUrgency;
}

export const DOCUMENT_FEES: Record<string, number> = {
  'Transcript of Records': 150,
  'Certificate of Enrollment': 50,
  'Diploma Copy': 200,
  'Good Moral Certificate': 75,
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_FEES);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function schoolYearOf(iso: string) {
  const { year, monthIndex } = parseISODate(iso);
  return monthIndex >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export function semesterOf(iso: string): Exclude<SemesterKey, 'all'> {
  const { monthIndex } = parseISODate(iso);
  if (monthIndex >= 7) return '1st';
  if (monthIndex <= 4) return '2nd';
  return 'summer';
}

export function formatSchoolYear(sy: string) {
  return `SY ${sy.replace('-', '–')}`;
}

export function formatSemester(key: SemesterKey) {
  if (key === '1st') return '1st Semester';
  if (key === '2nd') return '2nd Semester';
  if (key === 'summer') return 'Summer';
  return 'Whole school year';
}

export function currentSchoolYear() {
  const today = new Date();
  return schoolYearOf(toISODate(today.getFullYear(), today.getMonth(), today.getDate()));
}

export function currentSemester(): Exclude<SemesterKey, 'all'> {
  const today = new Date();
  return semesterOf(toISODate(today.getFullYear(), today.getMonth(), today.getDate()));
}

export async function getReportRecords(): Promise<ReportRecord[]> {
  const requests = await fetchRequests();
  return requests.map(request => ({
    id: request.id,
    date: request.createdAt.slice(0, 10),
    student: request.studentName,
    studentId: request.studentId || 'N/A',
    documentType: request.type,
    status: request.status,
    amount: request.amount,
    paid: request.paymentStatus === 'verified',
    urgency: request.urgency,
  }));
}

export function schoolYearOptions(records: ReportRecord[]) {
  const years = Array.from(new Set(records.map(item => schoolYearOf(item.date)))).sort();
  const current = currentSchoolYear();
  if (!years.includes(current)) years.push(current);
  Object.keys(loadAllCalendars()).forEach(year => {
    if (!years.includes(year)) years.push(year);
  });
  return years.sort();
}

export function monthsInFilter(schoolYear: string, term: SemesterKey = 'all') {
  const calendar = loadCalendar(schoolYear);
  if (term !== 'all') {
    const range = calendar.terms[term as TermKey];
    if (range.enabled && range.start && range.end && range.start <= range.end) {
      return monthsOverlappingRange(range.start, range.end);
    }
  }
  const span = schoolYearDateSpan(schoolYear, calendar);
  return monthsOverlappingRange(span.start, span.end);
}

export function filterRecords(
  records: ReportRecord[],
  schoolYear: string,
  monthKey: string,
  term: SemesterKey = 'all',
) {
  const calendar = loadCalendar(schoolYear);
  const span = schoolYearDateSpan(schoolYear, calendar);

  return records.filter(item => {
    if (item.date < span.start || item.date > span.end) return false;
    if (term !== 'all') {
      if (!dateInTerm(item.date, calendar, term)) return false;
    }
    if (monthKey !== 'all' && item.date.slice(0, 7) !== monthKey) return false;
    return true;
  });
}

export function summarize(records: ReportRecord[]) {
  const total = records.length;
  const completed = records.filter(item => item.status === 'completed').length;
  const rejected = records.filter(item => item.status === 'rejected').length;
  const inProcess = records.filter(item => !['completed', 'rejected'].includes(item.status)).length;
  const collected = records.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0);
  const unpaid = records.filter(item => !item.paid && item.status !== 'rejected').reduce((sum, item) => sum + item.amount, 0);
  const students = new Set(records.map(item => item.studentId)).size;
  const rush = records.filter(item => item.urgency === 'rush').length;

  const byStatus = {
    pending: records.filter(item => item.status === 'pending').length,
    approved: records.filter(item => item.status === 'approved').length,
    processing: records.filter(item => item.status === 'processing').length,
    ready: records.filter(item => item.status === 'ready').length,
    completed,
    rejected,
  };

  const documentTypes = Array.from(new Set([...records.map(item => item.documentType), ...(total ? [] : DOCUMENT_TYPES)]));
  const byDocument = documentTypes
    .map(type => {
      const count = records.filter(item => item.documentType === type).length;
      return {
        type,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
        revenue: records.filter(item => item.documentType === type && item.paid).reduce((sum, item) => sum + item.amount, 0),
      };
    })
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const monthMap = new Map<string, { month: string; submitted: number; completed: number; rejected: number; revenue: number }>();
  for (const item of records) {
    const { year, monthIndex } = parseISODate(item.date);
    const key = item.date.slice(0, 7);
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: `${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`,
        submitted: 0,
        completed: 0,
        rejected: 0,
        revenue: 0,
      });
    }
    const row = monthMap.get(key)!;
    row.submitted += 1;
    if (item.status === 'completed') row.completed += 1;
    if (item.status === 'rejected') row.rejected += 1;
    if (item.paid) row.revenue += item.amount;
  }

  return {
    total,
    completed,
    rejected,
    inProcess,
    collected,
    unpaid,
    students,
    rush,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    byStatus,
    byDocument,
    byMonth: Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
  };
}

export function recordsToCSV(records: ReportRecord[]) {
  const header = ['Request ID', 'Date', 'Student', 'Student ID', 'Document', 'Status', 'Processing', 'Amount', 'Payment'];
  const rows = records.map(item => [
    item.id,
    item.date,
    item.student,
    item.studentId,
    item.documentType,
    item.status,
    item.urgency,
    item.amount.toFixed(2),
    item.paid ? 'Paid' : 'Unpaid',
  ]);
  return [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
