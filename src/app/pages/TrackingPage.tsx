import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Search, ChevronRight, Clock, CheckCircle, Package,
  Star, FileText, Calendar, CreditCard, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchRequests, subscribeRequests, type StudentRequest } from '../lib/requests';
import { formatLongDate, paymentLabel, statusToStep } from '../lib/status';
import { useRevealOnSmallScreen } from '../lib/useRevealOnSmallScreen';
import { formatPeso } from '../lib/documents';
import { RejectionNotice } from '../components/RejectionNotice';

function toTrackItem(r: StudentRequest) {
  return {
    id: r.id,
    type: r.type,
    submitted: formatLongDate(r.createdAt),
    updated: formatLongDate(r.updatedAt),
    pickupDate: formatLongDate(r.pickupDate),
    pickupTime: r.pickupTime || 'TBD',
    currentStep: statusToStep(r.status),
    status: r.status,
    amount: formatPeso(r.amount),
    quantity: r.quantity,
    payment: paymentLabel(r.paymentStatus, r.paymentMethod),
    paymentStatus: r.paymentStatus,
    notes: r.notes,
    rejectionReason: r.rejectionReason,
    paymentRejectionReason: r.paymentRejectionReason,
  };
}

function PaymentNotice({ item }: { item: ReturnType<typeof toTrackItem> }) {
  if (item.status === 'rejected') {
    return (
      <RejectionNotice
        className="mt-3"
        title="Request not approved"
        text={item.rejectionReason}
        action={
          <Link
            to="/request"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            Request again <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
    );
  }
  if (item.paymentStatus === 'verified') {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-700 dark:text-green-300">Payment of {item.amount} verified. You’re fully paid, so there is nothing else to pay.</p>
      </div>
    );
  }
  if (item.paymentStatus === 'pending') {
    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">Payment of {item.amount} received. Waiting for the Registrar to verify it. You don’t need to pay again.</p>
      </div>
    );
  }
  if (item.paymentStatus === 'pay_later' || item.status === 'completed') return null;
  if (item.status === 'pending') {
    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Waiting for Registrar approval. Don’t pay yet — payment of {item.amount} opens once this request is approved. We’ll notify you.
        </p>
      </div>
    );
  }
  const rejected = item.paymentStatus === 'rejected';
  if (rejected) {
    return (
      <RejectionNotice
        className="mt-3"
        title="Payment not verified"
        text={item.paymentRejectionReason}
        fallback="Your proof of payment could not be verified."
        action={
          <Link
            to={`/payment?request=${encodeURIComponent(item.id)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            Submit proof again <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
    );
  }
  return (
    <div className={`mt-3 p-3 rounded-xl border flex flex-wrap items-center gap-2 ${
      rejected
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    }`}>
      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${rejected ? 'text-red-500' : 'text-orange-500'}`} />
      <p className={`flex-1 min-w-[10rem] text-xs ${rejected ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'}`}>
        {rejected
          ? 'Your proof of payment could not be verified. Please upload it again.'
          : `Payment of ${item.amount} is needed to process this request.`}
        {rejected && item.paymentRejectionReason && (
          <span className="block mt-1 break-words"><span className="font-semibold">Reason:</span> {item.paymentRejectionReason}</span>
        )}
      </p>
      <Link
        to={`/payment?request=${encodeURIComponent(item.id)}`}
        className={`text-xs font-semibold hover:underline ${rejected ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'}`}
      >
        {rejected ? 'Submit again' : 'Pay now'}
      </Link>
    </div>
  );
}

const STEPS = [
  { label: 'Pending Review', icon: Clock, desc: 'Your request is being reviewed by the Registrar.' },
  { label: 'Approved', icon: CheckCircle, desc: 'Request has been approved for processing.' },
  { label: 'Processing', icon: FileText, desc: 'Your document is being prepared.' },
  { label: 'Ready for Pickup', icon: Package, desc: 'Document is ready at the Registrar\'s Office.' },
  { label: 'Completed', icon: Star, desc: 'Document has been successfully claimed.' },
];

const statusColor = (step: number, idx: number) => {
  if (idx < step) return 'bg-green-500 border-green-500 text-white';
  if (idx === step) return 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30';
  return 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-400';
};

const lineColor = (step: number, idx: number) =>
  idx < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700';

export default function TrackingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestParam = searchParams.get('request');
  const [searchId, setSearchId] = useState('');
  const [items, setItems] = useState<ReturnType<typeof toTrackItem>[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ReturnType<typeof toTrackItem> | null>(null);
  const [pickCount, setPickCount] = useState(0);
  const detailRef = useRevealOnSmallScreen<HTMLDivElement>(pickCount);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      fetchRequests(user.id).then(list => {
        const mapped = list.map(toTrackItem);
        setItems(mapped);
        setSelectedRequest(prev =>
          mapped.find(item => item.id === prev?.id) ||
          mapped.find(item => item.id === requestParam) ||
          mapped[0] ||
          null,
        );
      });
    };
    refresh();
    return subscribeRequests(refresh);
  }, [user]);

  useEffect(() => {
    const match = requestParam && items.find(item => item.id === requestParam);
    if (!match) return;
    setSelectedRequest(match);
    setPickCount(n => n + 1);
  }, [requestParam, items.length]);

  const filtered = searchId
    ? items.filter(r =>
        r.id.toLowerCase().includes(searchId.toLowerCase()) ||
        r.type.toLowerCase().includes(searchId.toLowerCase())
      )
    : items;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 dark:text-white">Track Request</span>
        </div>
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Request Tracking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor the status of your document requests in real-time.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder="Search by Request ID or document type..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Request List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.map(req => {
            const isSelected = selectedRequest?.id === req.id;
            const step = req.currentStep;
            const statusLabels = ['Pending', 'Approved', 'Processing', 'Ready', 'Completed'];
            const statusColors = [
              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
              'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            ];

            return (
              <button
                key={req.id}
                onClick={() => {
                  setSelectedRequest(req);
                  setPickCount(n => n + 1);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{req.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    req.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : statusColors[step]
                  }`}>
                    {req.status === 'rejected' ? 'Rejected' : statusLabels[step]}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{req.type}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Submitted: {req.submitted}</p>

                {/* Mini Progress Bar */}
                <div className="mt-3 flex gap-0.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-200 dark:bg-slate-700'}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No requests found.</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedRequest && (
        <div ref={detailRef} className="lg:col-span-3 space-y-4 scroll-mt-20">
          {/* Status Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {selectedRequest.type}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ID: <span className="font-mono text-blue-600 dark:text-blue-400">{selectedRequest.id}</span>
                </p>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="relative">
              {STEPS.map((step, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Line */}
                  {i < STEPS.length - 1 && (
                    <div className={`absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 ${lineColor(selectedRequest.currentStep, i)}`} />
                  )}

                  {/* Icon */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${statusColor(selectedRequest.currentStep, i)}`}>
                    {i < selectedRequest.currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${i === selectedRequest.currentStep ? '' : 'opacity-60'}`}>
                    <p className={`text-sm font-medium ${i <= selectedRequest.currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                    {i === selectedRequest.currentStep && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                        Current Status
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Request Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: FileText, label: 'Document', value: `${selectedRequest.type} · ${selectedRequest.quantity} ${selectedRequest.quantity === 1 ? 'copy' : 'copies'}` },
                { icon: CreditCard, label: 'Amount', value: selectedRequest.amount },
                { icon: Calendar, label: 'Submitted', value: selectedRequest.submitted },
                { icon: Calendar, label: 'Last Updated', value: selectedRequest.updated },
                { icon: Clock, label: 'Pickup Date', value: selectedRequest.pickupDate },
                { icon: Clock, label: 'Pickup Time', value: selectedRequest.pickupTime },
                { icon: CreditCard, label: 'Payment', value: selectedRequest.payment },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-gray-900 dark:text-white font-medium text-xs mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedRequest.notes && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notes:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedRequest.notes}</p>
              </div>
            )}
            <PaymentNotice item={selectedRequest} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
