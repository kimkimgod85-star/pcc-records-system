import { requireSupabase } from './supabase';
import { tableMissing } from './status';
import { subscribeLocalAndRemote } from './realtime';

export type TermKey = '1st' | '2nd' | 'summer';

export interface TermRange {
  enabled: boolean;
  start: string;
  end: string;
}

export interface SchoolYearCalendar {
  schoolYear: string;
  terms: Record<TermKey, TermRange>;
}

const EVENT = 'pcc-academic-calendar-updated';
let cached: Record<string, SchoolYearCalendar> = {};

export const TERM_LABELS: Record<TermKey, string> = {
  '1st': '1st Semester',
  '2nd': '2nd Semester',
  summer: 'Summer',
};

function emptyTerms(): Record<TermKey, TermRange> {
  return {
    '1st': { enabled: false, start: '', end: '' },
    '2nd': { enabled: false, start: '', end: '' },
    summer: { enabled: false, start: '', end: '' },
  };
}

export function emptyCalendar(schoolYear: string): SchoolYearCalendar {
  return { schoolYear, terms: emptyTerms() };
}

function normalize(schoolYear: string, stored?: SchoolYearCalendar): SchoolYearCalendar {
  const blank = emptyCalendar(schoolYear);
  if (!stored?.terms) return blank;
  return {
    schoolYear,
    terms: {
      '1st': { ...blank.terms['1st'], ...stored.terms['1st'] },
      '2nd': { ...blank.terms['2nd'], ...stored.terms['2nd'] },
      summer: { ...blank.terms.summer, ...stored.terms.summer },
    },
  };
}

export async function fetchAllCalendars(): Promise<Record<string, SchoolYearCalendar>> {
  try {
    const client = requireSupabase();
    const { data, error } = await client.from('academic_calendars').select('*');
    if (error) throw error;
    const next: Record<string, SchoolYearCalendar> = {};
    (data || []).forEach(row => {
      next[row.school_year] = normalize(row.school_year, { schoolYear: row.school_year, terms: row.terms });
    });
    cached = next;
    return cached;
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return cached;
  }
}

export function loadAllCalendars(): Record<string, SchoolYearCalendar> {
  return cached;
}

export function loadCalendar(schoolYear: string): SchoolYearCalendar {
  return normalize(schoolYear, cached[schoolYear]);
}

export async function persistCalendar(calendar: SchoolYearCalendar) {
  const client = requireSupabase();
  const { error } = await client.from('academic_calendars').upsert({
    school_year: calendar.schoolYear,
    terms: calendar.terms,
  });
  if (error) throw error;
  cached[calendar.schoolYear] = calendar;
  window.dispatchEvent(new Event(EVENT));
  return calendar;
}

export function saveCalendar(calendar: SchoolYearCalendar) {
  cached[calendar.schoolYear] = calendar;
  window.dispatchEvent(new Event(EVENT));
  void persistCalendar(calendar);
  return calendar;
}

export function subscribeAcademicCalendar(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['academic_calendars'], onChange);
}

export function isTermComplete(term: TermRange) {
  return Boolean(term.enabled && term.start && term.end && term.start <= term.end);
}

export function configuredTerms(calendar: SchoolYearCalendar) {
  return (Object.keys(calendar.terms) as TermKey[]).filter(key => isTermComplete(calendar.terms[key]));
}

export function schoolYearDateSpan(schoolYear: string, calendar = loadCalendar(schoolYear)) {
  const configured = configuredTerms(calendar);
  if (configured.length === 0) {
    const startYear = Number(schoolYear.split('-')[0]);
    return { start: `${startYear}-08-01`, end: `${startYear + 1}-07-31`, usingFallback: true };
  }
  const starts = configured.map(key => calendar.terms[key].start);
  const ends = configured.map(key => calendar.terms[key].end);
  const sortedStarts = [...starts].sort();
  const sortedEnds = [...ends].sort();
  return {
    start: sortedStarts[0],
    end: sortedEnds[sortedEnds.length - 1],
    usingFallback: false,
  };
}

export function dateInTerm(iso: string, calendar: SchoolYearCalendar, term: TermKey) {
  const range = calendar.terms[term];
  if (!isTermComplete(range)) return false;
  return iso >= range.start && iso <= range.end;
}

export function formatDateShort(iso: string) {
  if (!iso) return 'Not set';
  const [year, month, day] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

export function termFilterLabel(calendar: SchoolYearCalendar, key: TermKey) {
  const term = calendar.terms[key];
  if (!isTermComplete(term)) return `${TERM_LABELS[key]} (set dates first)`;
  return `${TERM_LABELS[key]} (${formatDateShort(term.start)} – ${formatDateShort(term.end)})`;
}

export function monthsOverlappingRange(start: string, end: string) {
  const months: { key: string; label: string }[] = [];
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const cursor = new Date(sy, sm - 1, 1);
  const last = new Date(ey, em - 1, 1);
  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    if (key <= todayKey) {
      months.push({ key, label: `${names[cursor.getMonth()]} ${cursor.getFullYear()}` });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}
