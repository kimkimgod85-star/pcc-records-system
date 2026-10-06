import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import {
  CalendarDays, Download, FileText, CheckCircle, Clock, Wallet, ChevronDown,
  FileType2, FileSpreadsheet, Loader2, AlertCircle, Users, Zap, XCircle, Check,
} from 'lucide-react';
import {
  currentSchoolYear,
  downloadTextFile,
  filterRecords,
  formatSchoolYear,
  getReportRecords,
  monthsInFilter,
  recordsToCSV,
  schoolYearOptions,
  summarize,
  type ReportRecord,
  type SemesterKey,
} from '../../lib/reports';
import {
  fetchAllCalendars,
  persistCalendar,
  subscribeAcademicCalendar,
  TERM_LABELS,
  configuredTerms,
  formatDateShort,
  isTermComplete,
  loadCalendar,
  termFilterLabel,
  type SchoolYearCalendar,
  type TermKey,
} from '../../lib/academicCalendar';
import { formatISODate } from '../../lib/scheduling';
import { fetchDocumentCatalog, priceCaption } from '../../lib/documents';
import {
  buildReportModel,
  exportReportDocx,
  exportReportPdf,
  PAPER_SIZES,
  REPORT_KINDS,
  type ReportKind,
  type PaperSize,
  type Orientation,
} from '../../lib/reportExport';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';

type DownloadFormat = 'pdf' | 'docx' | 'csv';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  processing: 'Being prepared',
  ready: 'Ready for pickup',
  completed: 'Claimed',
  rejected: 'Rejected',
};

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-orange-500',
  approved: 'bg-blue-500',
  processing: 'bg-purple-500',
  ready: 'bg-cyan-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
};

const FORMATS: { value: DownloadFormat; label: string; detail: string; icon: typeof FileText }[] = [
  { value: 'pdf', label: 'PDF', detail: 'Ready to print', icon: FileText },
  { value: 'docx', label: 'Word', detail: 'Editable .docx', icon: FileType2 },
  { value: 'csv', label: 'Excel (CSV)', detail: 'Raw data', icon: FileSpreadsheet },
];

const selectClass =
  'w-full pl-3 pr-9 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none';
const dateClass =
  'w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

function peso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminReports() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [priceText, setPriceText] = useState('');

  useEffect(() => {
    const refresh = () => {
      Promise.all([getReportRecords(), fetchAllCalendars(), fetchDocumentCatalog()]).then(([live]) => {
        setRecords(live);
        setPriceText(priceCaption());
      });
    };
    refresh();
    return subscribeAcademicCalendar(refresh);
  }, []);

  const years = useMemo(() => schoolYearOptions(records), [records]);

  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [term, setTerm] = useState<SemesterKey>('all');
  const [monthKey, setMonthKey] = useState('all');
  const [calendar, setCalendar] = useState<SchoolYearCalendar>(() => loadCalendar(currentSchoolYear()));
  const [draft, setDraft] = useState<SchoolYearCalendar>(() => loadCalendar(currentSchoolYear()));
  const [saved, setSaved] = useState(false);
  const [dateError, setDateError] = useState('');
  const [datesOpen, setDatesOpen] = useState(() => configuredTerms(loadCalendar(currentSchoolYear())).length === 0);

  const [kind, setKind] = useState<ReportKind>('full');
  const [format, setFormat] = useState<DownloadFormat>('pdf');
  const [paper, setPaper] = useState<PaperSize>('letter');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportDone, setExportDone] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const next = loadCalendar(schoolYear);
      setCalendar(next);
      setDraft(next);
    };
    refresh();
    return subscribeAcademicCalendar(refresh);
  }, [schoolYear]);

  const readyTerms = configuredTerms(calendar);
  const selectedTermValid = term === 'all' || readyTerms.includes(term);
  const effectiveTerm: SemesterKey = selectedTermValid ? term : 'all';

  const monthChoices = monthsInFilter(schoolYear, effectiveTerm);
  const selectedMonthStillValid = monthKey === 'all' || monthChoices.some(item => item.key === monthKey);
  const effectiveMonth = selectedMonthStillValid ? monthKey : 'all';

  const filtered = filterRecords(records, schoolYear, effectiveMonth, effectiveTerm);
  const stats = summarize(filtered);
  const monthLabel = monthChoices.find(item => item.key === effectiveMonth)?.label;
  const termLabel = effectiveTerm === 'all' ? 'Whole school year' : TERM_LABELS[effectiveTerm];

  const periodText = [
    formatSchoolYear(schoolYear),
    termLabel,
    effectiveMonth === 'all' ? 'All months' : monthLabel,
  ].join(' • ');

  const changeSchoolYear = (value: string) => {
    setSchoolYear(value);
    setTerm('all');
    setMonthKey('all');
    setDateError('');
  };

  const updateDraftTerm = (key: TermKey, patch: Partial<SchoolYearCalendar['terms'][TermKey]>) => {
    setDraft(prev => ({
      ...prev,
      terms: {
        ...prev.terms,
        [key]: { ...prev.terms[key], ...patch },
      },
    }));
  };

  const saveDates = async () => {
    const next = draft.schoolYear === schoolYear ? draft : { ...draft, schoolYear };
    for (const key of Object.keys(next.terms) as TermKey[]) {
      const range = next.terms[key];
      if (!range.enabled) continue;
      if (!range.start || !range.end) {
        setDateError(`Add both start and end dates for ${TERM_LABELS[key]}.`);
        return;
      }
      if (range.start > range.end) {
        setDateError(`${TERM_LABELS[key]} cannot end before it starts.`);
        return;
      }
    }
    const stored = await persistCalendar(next);
    setCalendar(stored);
    setDraft(stored);
    setDateError('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const fileBase = () => {
    const parts = ['PCC', REPORT_KINDS.find(k => k.value === kind)?.label || 'Report', formatSchoolYear(schoolYear)];
    if (effectiveTerm !== 'all') parts.push(TERM_LABELS[effectiveTerm]);
    if (effectiveMonth !== 'all' && monthLabel) parts.push(monthLabel);
    return parts.join(' - ').replace(/[\\/:*?"<>|–]/g, '-').replace(/\s+/g, ' ').trim();
  };

  const exportCsv = () => {
    if (kind === 'payments') {
      downloadTextFile(`${fileBase()}.csv`, recordsToCSV(filtered.filter(item => item.paid)));
      return;
    }
    if (kind === 'students') {
      const students = Array.from(new Map(filtered.map(item => [item.studentId, item])).values());
      const csv = [
        ['Student ID', 'Student Name', 'Requests in period'],
        ...students.map(item => [
          item.studentId,
          item.student,
          String(filtered.filter(row => row.studentId === item.studentId).length),
        ]),
      ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadTextFile(`${fileBase()}.csv`, csv);
      return;
    }
    downloadTextFile(`${fileBase()}.csv`, recordsToCSV(filtered));
  };

  const download = async () => {
    setExporting(true);
    setExportError('');
    setExportDone(false);
    try {
      if (format === 'csv') {
        exportCsv();
      } else {
        const model = buildReportModel({
          kind,
          records: filtered,
          period: periodText,
          preparedBy: user?.name || '',
          currency: format === 'pdf' ? 'PHP ' : '₱',
        });
        if (format === 'pdf') await exportReportPdf(model, paper, orientation, `${fileBase()}.pdf`);
        else await exportReportDocx(model, paper, orientation, `${fileBase()}.docx`);
      }
      setExportDone(true);
      window.setTimeout(() => setExportDone(false), 2500);
    } catch (err) {
      console.error(err);
      setExportError(err instanceof Error ? err.message : 'Could not create the file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const savedDatesText = readyTerms
    .map(key => `${TERM_LABELS[key]}: ${formatDateShort(calendar.terms[key].start)} – ${formatDateShort(calendar.terms[key].end)}`)
    .join(' · ');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Registrar Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose a period, review the numbers, then download a printable report.
        </p>
      </div>

      {/* Period */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-5">
        <div className="p-4 sm:p-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <SelectField label="School year">
              <select value={schoolYear} onChange={e => changeSchoolYear(e.target.value)} className={selectClass}>
                {years.map(year => (
                  <option key={year} value={year}>{formatSchoolYear(year)}</option>
                ))}
              </select>
            </SelectField>
            <SelectField label="Semester">
              <select
                value={effectiveTerm}
                onChange={e => {
                  setTerm(e.target.value as SemesterKey);
                  setMonthKey('all');
                }}
                className={selectClass}
              >
                <option value="all">Whole school year</option>
                {(Object.keys(TERM_LABELS) as TermKey[]).map(key => (
                  <option key={key} value={key} disabled={!isTermComplete(calendar.terms[key])}>
                    {termFilterLabel(calendar, key)}
                  </option>
                ))}
              </select>
            </SelectField>
            <SelectField label="Month">
              <select value={effectiveMonth} onChange={e => setMonthKey(e.target.value)} className={selectClass}>
                <option value="all">All months</option>
                {monthChoices.map(month => (
                  <option key={month.key} value={month.key}>{month.label}</option>
                ))}
              </select>
            </SelectField>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 font-medium">
              <CalendarDays className="w-4 h-4" /> {periodText}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {stats.total} request{stats.total === 1 ? '' : 's'} in this period
            </span>
          </div>
        </div>

        {/* Class dates (collapsible) */}
        <div className="border-t border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setDatesOpen(open => !open)}
            className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/40 rounded-b-2xl"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Class dates for {formatSchoolYear(schoolYear)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {readyTerms.length ? savedDatesText : 'Not set yet. Semester filters stay locked until you add the dates.'}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${datesOpen ? 'rotate-180' : ''}`} />
          </button>
          {datesOpen && (
            <div className="px-4 sm:px-5 pb-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Opening day changes every year. Enter the real start and end of each term so semester reports are accurate.
              </p>
              <div className="space-y-2.5 mb-4">
                {(Object.keys(TERM_LABELS) as TermKey[]).map(key => {
                  const range = draft.terms[key];
                  return (
                    <div key={key} className="grid sm:grid-cols-[170px_1fr_1fr] gap-3 items-end rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 sm:pb-2.5">
                        <input
                          type="checkbox"
                          checked={range.enabled}
                          onChange={e => updateDraftTerm(key, { enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {TERM_LABELS[key]}
                      </label>
                      <label className="block">
                        <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Start</span>
                        <input
                          type="date"
                          value={range.start}
                          disabled={!range.enabled}
                          onChange={e => updateDraftTerm(key, { start: e.target.value })}
                          className={dateClass}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">End</span>
                        <input
                          type="date"
                          value={range.end}
                          disabled={!range.enabled}
                          onChange={e => updateDraftTerm(key, { end: e.target.value })}
                          className={dateClass}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              {dateError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {dateError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveDates}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Save class dates
                </button>
                {saved && (
                  <span className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved for {formatSchoolYear(schoolYear)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={FileText} label="Requests submitted" value={String(stats.total)} sub="All requests in this period" tone="blue" />
        <StatCard icon={CheckCircle} label="Claimed" value={String(stats.completed)} sub={`${stats.completionRate}% completion rate`} tone="green" />
        <StatCard icon={Clock} label="Still in process" value={String(stats.inProcess)} sub="Not yet claimed or rejected" tone="orange" />
        <StatCard icon={Wallet} label="Fees collected" value={peso(stats.collected)} sub={stats.unpaid ? `${peso(stats.unpaid)} still unpaid` : 'Nothing unpaid'} tone="purple" />
      </div>

      {/* Status breakdown */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-5 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-100 dark:bg-slate-700">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="bg-white dark:bg-slate-800 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                <p className="text-sm text-gray-600 dark:text-gray-400">{STATUS_LABEL[status]}</p>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card title="Requests by month" subtitle="Submitted, claimed, and rejected requests per month.">
          {stats.byMonth.length === 0 ? (
            <EmptyChart text="No requests in this period yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byMonth} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: '13px', borderRadius: '10px' }} />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Bar dataKey="submitted" name="Submitted" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Claimed" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Fees collected by month" subtitle={priceText || 'Verified payments per month.'}>
          {stats.byMonth.length === 0 ? (
            <EmptyChart text="No payments in this period yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} width={52} />
                <Tooltip contentStyle={{ fontSize: '13px', borderRadius: '10px' }} formatter={(value: number) => [peso(value), 'Collected']} />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3.5, fill: '#2563EB' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Documents + snapshot */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <Card title="What students asked for" subtitle="Number of requests and fees collected per document.">
            {stats.byDocument.length === 0 ? (
              <EmptyChart text="No requests in this period yet." />
            ) : (
              <div className="space-y-4">
                {stats.byDocument.map(doc => (
                  <div key={doc.type}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-1.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{doc.type}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                        <span className="font-semibold text-gray-900 dark:text-white">{doc.count}</span> ({doc.pct}%) · {peso(doc.revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${doc.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Period snapshot">
          <dl className="divide-y divide-gray-100 dark:divide-slate-700 -my-1">
            <SnapshotRow icon={Users} label="Students served" value={String(stats.students)} />
            <SnapshotRow icon={Zap} label="Rush requests" value={String(stats.rush)} />
            <SnapshotRow icon={XCircle} label="Rejected" value={String(stats.rejected)} />
            <SnapshotRow icon={Wallet} label="Unpaid fees" value={peso(stats.unpaid)} highlight={stats.unpaid > 0} />
          </dl>
        </Card>
      </div>

      {/* Download */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-5">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Download report</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">For {periodText}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">1. What to include</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {REPORT_KINDS.map(option => {
                const active = kind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={`text-left p-3.5 rounded-xl border transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${active ? 'text-blue-800 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>{option.label}</p>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_rgb(30,41,59)]' : 'border-gray-300 dark:border-slate-500'}`} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">2. File type</p>
            <div className="grid grid-cols-3 gap-2.5">
              {FORMATS.map(option => {
                const active = format === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormat(option.value)}
                    className={`flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 p-3 rounded-xl border text-center sm:text-left transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${active ? 'text-blue-800 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>{option.label}</span>
                      <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">{option.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {format !== 'csv' && (
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">3. Paper size</p>
                <Segmented
                  value={paper}
                  onChange={setPaper}
                  options={PAPER_SIZES.map(p => ({ value: p.value, label: p.label, hint: p.detail }))}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">4. Orientation</p>
                <Segmented
                  value={orientation}
                  onChange={setOrientation}
                  options={[
                    { value: 'portrait', label: 'Portrait', hint: 'Tall' },
                    { value: 'landscape', label: 'Landscape', hint: 'Wide, fits more columns' },
                  ]}
                />
              </div>
            </div>
          )}

          {exportError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{exportError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format === 'csv'
                ? 'Opens in Excel or Google Sheets.'
                : `${PAPER_SIZES.find(p => p.value === paper)?.label} · ${orientation === 'portrait' ? 'Portrait' : 'Landscape'} · with PCC letterhead, page numbers, and signature lines.`}
            </p>
            <button
              type="button"
              onClick={download}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : exportDone ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Preparing file…' : exportDone ? 'Downloaded' : `Download ${FORMATS.find(f => f.value === format)?.label}`}
            </button>
          </div>
        </div>
      </section>

      {/* Request list */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Requests in this period
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">The same records used in the totals and charts.</p>
          </div>
          {filtered.length > 80 && <span className="text-sm text-gray-500 dark:text-gray-400">Showing latest 80 of {filtered.length}</span>}
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-sm text-center text-gray-500 dark:text-gray-400">No requests for this period yet.</p>
        ) : (
          <>
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
              {filtered.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 80).map(item => (
                <div key={item.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{item.documentType}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.student}</p>
                    </div>
                    <StatusBadge status={item.status} label={STATUS_LABEL[item.status]} />
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-1.5 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{formatISODate(item.date)}</span>
                    <span className={`font-semibold tabular-nums ${item.paid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {peso(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-auto max-h-[480px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-5 py-3">Request</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 hidden md:table-cell">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtered.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 80).map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{item.documentType}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{item.id}</span>
                          {item.urgency === 'rush' && <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">· Rush</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-900 dark:text-white leading-snug">{item.student}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.studentId}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap hidden md:table-cell">
                        {formatISODate(item.date)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={item.status} label={STATUS_LABEL[item.status]} />
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{peso(item.amount)}</p>
                        <p className={`text-xs font-medium ${item.paid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {item.paid ? 'Paid' : 'Unpaid'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const TONE = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

function StatCard({ icon: Icon, label, value, sub, tone }: {
  icon: typeof FileText; label: string; value: string; sub: string; tone: keyof typeof TONE;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${TONE[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-snug">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-3 break-words" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{sub}</p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-5 h-full">
      <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}

function SnapshotRow({ icon: Icon, label, value, highlight }: { icon: typeof Users; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
        <Icon className="w-4 h-4 text-gray-400" /> {label}
      </dt>
      <dd className={`text-sm font-semibold tabular-nums ${highlight ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{value}</dd>
    </div>
  );
}

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</span>
      <span className="relative block">
        {children}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </span>
    </label>
  );
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (value: T) => void; options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div>
      <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-slate-900">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === option.value
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{options.find(o => o.value === value)?.hint}</p>
    </div>
  );
}
