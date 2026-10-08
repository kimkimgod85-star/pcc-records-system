import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronRight, Upload, CheckCircle, Clock, Smartphone, MapPin, X } from 'lucide-react';
import { formatPeso, fetchDocumentCatalog } from '../lib/documents';
import { fetchRequests, subscribeRequests, type StudentRequest } from '../lib/requests';
import { submitPayment } from '../lib/payments';
import { useAuth } from '../context/AuthContext';

function ProofUpload({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const preview = file ? URL.createObjectURL(file) : '';

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-600'
        }`}
      >
        {file ? (
          <div className="space-y-3">
            <img src={preview} alt={label} className="w-full max-h-56 object-contain rounded-lg bg-gray-50 dark:bg-slate-900" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag & drop or{' '}
              <label className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                browse files
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]); }}
                />
              </label>
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </>
        )}
      </div>
    </div>
  );
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function PaidRow({ item, highlight = false }: { item: StudentRequest; highlight?: boolean }) {
  const verified = item.paymentStatus === 'verified';
  return (
    <div className={`p-3 sm:p-4 rounded-xl border flex items-start gap-3 ${
      highlight
        ? verified
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
    }`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        verified ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      }`}>
        {verified ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.type}</p>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPeso(item.amount)}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.id}</p>
        <p className={`text-xs mt-1.5 ${verified ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
          {verified
            ? 'Payment verified. You’re fully paid, so there is nothing else to pay.'
            : 'Payment received. Waiting for the Registrar to verify it. You don’t need to pay again.'}
        </p>
        <Link
          to={`/track?request=${encodeURIComponent(item.id)}`}
          className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Track this request
        </Link>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('request');
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      Promise.all([fetchRequests(user.id), fetchDocumentCatalog()]).then(([items]) => {
        setRequests(items);
        setLoaded(true);
      });
    };
    refresh();
    return subscribeRequests(refresh);
  }, [user]);

  const open = requests.filter(item => item.status !== 'rejected' && item.status !== 'completed');
  const payable = open
    .filter(item => item.paymentStatus === 'unpaid' || item.paymentStatus === 'rejected' || item.paymentStatus === 'pay_later')
    .map(item => ({
      id: item.id,
      uuid: item.uuid,
      type: item.type,
      amountValue: item.amount,
      amount: formatPeso(item.amount),
      retry: item.paymentStatus === 'rejected',
      retryReason: item.paymentRejectionReason,
    }));
  const alreadyPaid = requests.filter(item => item.paymentStatus === 'pending' || item.paymentStatus === 'verified');
  const focused = requestedId ? alreadyPaid.find(item => item.id === requestedId) : undefined;

  const initialRequest = payable.find(r => r.id === requestedId)?.id || payable[0]?.id || '';
  const [selectedRequest, setSelectedRequest] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cashier'>('gcash');
  const [gcashRef, setGcashRef] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [orNumber, setOrNumber] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const req = payable.find(r => r.id === (selectedRequest || initialRequest));
  const refNo = paymentMethod === 'gcash' ? gcashRef.trim() : orNumber.trim();
  const proof = paymentMethod === 'gcash' ? screenshot : receipt;
  const canSubmit = Boolean(req && refNo && proof);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !req || !refNo || !proof) return;
    if (!proof.type.startsWith('image/')) {
      setFormError('Upload a photo (PNG or JPG) of your proof of payment.');
      return;
    }
    if (proof.size > MAX_PROOF_BYTES) {
      setFormError('Photo is too large. Use an image under 5MB.');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await submitPayment({
        requestUuid: req.uuid,
        userId: user.id,
        method: paymentMethod,
        amount: req.amountValue,
        refNo,
        screenshot: proof,
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save payment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (payable.length && !payable.some(r => r.id === selectedRequest)) {
      setSelectedRequest(payable.find(r => r.id === requestedId)?.id || payable[0].id);
    }
  }, [payable.map(r => r.id).join(), requestedId, selectedRequest]);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {paymentMethod === 'gcash' ? 'Payment Submitted!' : 'Receipt Submitted!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {paymentMethod === 'gcash'
              ? 'Your GCash payment has been submitted for verification. You will be notified once it\'s confirmed.'
              : 'Your cashier receipt was sent to the Registrar for verification. You will be notified once it\'s confirmed. Keep the original receipt for claiming.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/track" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              Track Request
            </Link>
            <Link to="/dashboard" className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 dark:text-white">Payment</span>
        </div>
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Complete Payment
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose your preferred payment method to complete your request.
        </p>
      </div>

      {focused && (
        <div className="mb-5">
          <PaidRow item={focused} highlight />
        </div>
      )}

      {loaded && payable.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 text-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-gray-900 dark:text-white">Nothing to pay right now</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {alreadyPaid.length
              ? 'Your requests are already paid or waiting for verification.'
              : 'You have no unpaid requests. Submit a document request first.'}
          </p>
          <Link
            to={alreadyPaid.length ? '/track' : '/request'}
            className="inline-block mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
          >
            {alreadyPaid.length ? 'Track my requests' : 'Request a document'}
          </Link>
        </div>
      )}

      {payable.length > 0 && (
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Select Request */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Select Request to Pay
          </h2>
          <div className="space-y-2">
            {payable.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRequest(r.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedRequest === r.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{r.id}</p>
                    {r.retry && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                        Previous proof was not accepted{r.retryReason ? ` — ${r.retryReason.replace(/[.\s]+$/, '')}` : ''}. Please submit again.
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">{r.amount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Payment Method
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { value: 'gcash', label: 'GCash', icon: Smartphone, desc: 'Online payment via GCash' },
              { value: 'cashier', label: 'Pay in Person', icon: MapPin, desc: 'Pay at PCC Cashier' },
            ].map(method => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value as 'gcash' | 'cashier')}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === method.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <method.icon className={`w-5 h-5 mb-2 ${paymentMethod === method.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-900 dark:text-white">{method.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{method.desc}</p>
              </button>
            ))}
          </div>

          {/* GCash Form */}
          {paymentMethod === 'gcash' && (
            <div className="space-y-4">
              {/* GCash Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">GCash Payment Details</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">GCash Number</span>
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">09XX-XXX-XXXX</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">Account Name</span>
                    <span className="font-medium text-blue-700 dark:text-blue-300">PCC Cashier</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">Amount to Pay</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{req?.amount}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  GCash Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={gcashRef}
                  onChange={e => setGcashRef(e.target.value)}
                  placeholder="e.g. 1234567890123"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>

              <ProofUpload label="Payment Screenshot" file={screenshot} onChange={setScreenshot} />
            </div>
          )}

          {/* Cashier Instructions */}
          {paymentMethod === 'cashier' && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">Pay at the Cashier</p>
                <div className="space-y-2">
                  {[
                    'Bring your Request ID and valid school ID',
                    'Proceed to the Cashier\'s Office (PCC Main Building, Ground Floor)',
                    `Pay the amount of ${req?.amount} for your document`,
                    'Take a clear photo of your Official Receipt and upload it below',
                    'The Registrar verifies the receipt, then processes your request',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Cashier Hours</p>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-amber-700 dark:text-amber-300">Monday – Saturday</span>
                      <span className="font-medium text-amber-800 dark:text-amber-200">8:00 AM – 4:00 PM</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-amber-700 dark:text-amber-300">Sunday</span>
                      <span className="font-medium text-red-600 dark:text-red-400">Closed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Official Receipt (OR) Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orNumber}
                  onChange={e => setOrNumber(e.target.value)}
                  placeholder="e.g. OR-0012345"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>

              <ProofUpload label="Photo of Official Receipt" file={receipt} onChange={setReceipt} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Make sure the OR number, amount, date, and cashier stamp are readable.
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          {loading
            ? 'Processing...'
            : paymentMethod === 'gcash'
            ? 'Submit Payment'
            : 'Submit Receipt'}
        </button>
      </form>
      )}

      {alreadyPaid.some(item => item.id !== focused?.id) && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Already paid
          </h2>
          <div className="space-y-2">
            {alreadyPaid.filter(item => item.id !== focused?.id).map(item => <PaidRow key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}
