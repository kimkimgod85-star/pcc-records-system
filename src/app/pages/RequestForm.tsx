import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { FileText, ChevronRight, CheckCircle, AlertCircle, Tag, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createRequest } from '../lib/requests';
import {
  computeRequestTotal,
  describeCatalogChanges,
  fetchDocumentCatalog,
  formatPeso,
  getAvailableDocuments,
  getRushFee,
  subscribeDocumentCatalog,
  type CatalogDocument,
  type DocumentCatalog,
} from '../lib/documents';
import type { ProcessingUrgency } from '../lib/scheduling';

const PURPOSES = [
  'Employment',
  'Further Studies / Graduate School',
  'Scholarship Application',
  'Transfer of School',
  'Government / Legal Requirements',
  'Personal Records',
  'Others',
];

export default function RequestForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    documentType: '',
    purpose: '',
    quantity: '1',
    notes: '',
    urgency: 'regular' as ProcessingUrgency,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [rushFee, setRushFee] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [priceNotice, setPriceNotice] = useState<string[]>([]);
  const lastCatalog = useRef<DocumentCatalog | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const catalog = await fetchDocumentCatalog();
      const previous = lastCatalog.current;
      lastCatalog.current = { rushFee: catalog.rushFee, documents: catalog.documents.map(item => ({ ...item })) };
      if (previous) {
        const changes = describeCatalogChanges(previous, catalog).filter(item => item.kind !== 'details');
        if (changes.length) {
          setPriceNotice(prev => Array.from(new Set([...prev, ...changes.map(item => item.label)])));
        }
      }
      const available = getAvailableDocuments(catalog);
      setDocuments(available);
      setRushFee(getRushFee(catalog));
      setForm(prev => {
        if (!prev.documentType || available.some(item => item.code === prev.documentType)) return prev;
        setStep(1);
        return { ...prev, documentType: '' };
      });
    };
    refresh();
    return subscribeDocumentCatalog(() => { void refresh(); });
  }, []);

  const selectedDoc = documents.find(d => d.code === form.documentType);
  const totals = computeRequestTotal(form.documentType, Number(form.quantity), form.urgency);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setSubmitError('');
    try {
      const created = await createRequest({
        userId: user.id,
        type: selectedDoc?.name || 'Document Request',
        documentCode: form.documentType,
        purpose: form.purpose,
        quantity: Number(form.quantity) || 1,
        notes: form.notes,
        urgency: form.urgency,
        amount: totals.total,
      });
      setSubmittedId(created.id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit request. Run supabase/schema.sql in the SQL Editor first.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Request Submitted!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            Your request ID is <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{submittedId}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            The Registrar's Office will review your request within 1–2 business days. You will receive a notification once approved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/payment"
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Proceed to Payment
            </Link>
            <Link
              to={`/schedule?request=${submittedId}`}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Schedule Pickup
            </Link>
            <Link
              to="/track"
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Track Request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 dark:text-white">Request Records</span>
        </div>
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Request School Records
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fill out the form below to submit your document request.
        </p>
      </div>

      {priceNotice.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Prices were just updated by the Registrar</p>
            <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
              {priceNotice.map(item => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <button type="button" onClick={() => setPriceNotice([])} aria-label="Dismiss" className="text-amber-500 hover:text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[
          { num: 1, label: 'Document Type' },
          { num: 2, label: 'Details' },
          { num: 3, label: 'Review' },
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step > s.num
                  ? 'bg-green-500 text-white'
                  : step === s.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.num ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${step > s.num ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Step 1: Document Type */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Select Document Type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => (
                <button
                  key={doc.code}
                  onClick={() => setForm({ ...form, documentType: doc.code })}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    form.documentType === doc.code
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{doc.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">{formatPeso(doc.fee)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{doc.description}</p>
                    </div>
                  </div>
                  {form.documentType === doc.code && (
                    <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="text-xs">Selected</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!form.documentType}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Request Details
            </h2>

            <div className="space-y-4">
              {/* Selected Document Summary */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                <span className="text-xl">{selectedDoc?.icon}</span>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedDoc?.name}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Processing Fee: {selectedDoc ? formatPeso(selectedDoc.fee) : ''}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Purpose of Request <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select purpose...</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quantity: String(Math.max(1, Number(form.quantity) - 1)) })}
                    className="w-9 h-9 rounded-xl border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-lg"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-gray-900 dark:text-white font-medium">{form.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quantity: String(Math.min(5, Number(form.quantity) + 1)) })}
                    className="w-9 h-9 rounded-xl border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 text-lg"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">copy/copies (max 5)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Processing Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'regular', label: 'Regular', desc: '5-7 business days', fee: '' },
                    { value: 'rush', label: 'Rush', desc: '2-3 business days', fee: `+${formatPeso(rushFee)}` },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, urgency: opt.value as ProcessingUrgency })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.urgency === opt.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                        {opt.fee && <span className="text-xs text-orange-500">{opt.fee}</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Any special instructions or information..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.purpose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Review Request
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Review Your Request
            </h2>

            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-5 space-y-3 mb-5">
              {[
                { label: 'Document Type', value: selectedDoc?.name },
                { label: 'Purpose', value: form.purpose },
                { label: 'Quantity', value: `${form.quantity} copy/copies` },
                { label: 'Processing', value: form.urgency === 'rush' ? 'Rush (2–3 days)' : 'Regular (5–7 days)' },
                { label: 'Base Fee', value: selectedDoc ? formatPeso(selectedDoc.fee) : '—' },
                { label: 'Rush Fee', value: form.urgency === 'rush' ? formatPeso(rushFee) : 'N/A' },
                {
                  label: 'Total Amount',
                  value: formatPeso(totals.total),
                  highlight: true,
                },
              ].map((item, i) => (
                <div key={i} className={`flex justify-between items-center ${item.highlight ? 'pt-3 border-t border-gray-200 dark:border-slate-700' : ''}`}>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                  <span className={`text-sm ${item.highlight ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
              {form.notes && (
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{form.notes}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                By submitting this request, you confirm that all provided information is accurate. Payment is required before document release.
              </p>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
