import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, CheckCircle, Banknote, Save, RotateCcw, Bell, AlertCircle, Eye, EyeOff } from 'lucide-react';
import {
  formatPeso,
  fetchDocumentCatalog,
  persistDocumentCatalog,
  subscribeDocumentCatalog,
  describeCatalogChanges,
  DEFAULT_DOCUMENTS,
  type CatalogDocument,
  type DocumentCatalog,
} from '../../lib/documents';
import { notifyAllStudents } from '../../lib/notifications';

const cloneCatalog = (catalog: DocumentCatalog): DocumentCatalog => ({
  rushFee: catalog.rushFee,
  documents: catalog.documents.map(item => ({ ...item })),
});

const inputClass =
  'px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function AdminDocuments() {
  const [saved, setSaved] = useState<DocumentCatalog>({ documents: DEFAULT_DOCUMENTS.map(item => ({ ...item })), rushFee: 100 });
  const [draft, setDraft] = useState<DocumentCatalog>(() => cloneCatalog(saved));
  const [loaded, setLoaded] = useState(false);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newDoc, setNewDoc] = useState({ name: '', description: '', icon: '📄', fee: 100 });

  const changes = describeCatalogChanges(saved, draft);
  const dirty = changes.length > 0;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const refresh = () => {
      void fetchDocumentCatalog().then(catalog => {
        setSaved(cloneCatalog(catalog));
        if (!dirtyRef.current) setDraft(cloneCatalog(catalog));
        setLoaded(true);
      });
    };
    refresh();
    return subscribeDocumentCatalog(refresh);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const updateDoc = (code: string, patch: Partial<CatalogDocument>) => {
    setMessage(null);
    setDraft(prev => ({
      ...prev,
      documents: prev.documents.map(item => item.code === code ? { ...item, ...patch } : item),
    }));
  };

  const addDocument = () => {
    const name = newDoc.name.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Enter a document name first.' });
      return;
    }
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'doc';
    let code = base;
    let n = 2;
    while (draft.documents.some(item => item.code === code)) code = `${base}${n++}`;
    setDraft(prev => ({
      ...prev,
      documents: [
        ...prev.documents,
        {
          code,
          name,
          description: newDoc.description.trim() || 'School record document',
          icon: newDoc.icon.trim() || '📄',
          fee: Math.max(0, Number(newDoc.fee) || 0),
          available: true,
        },
      ],
    }));
    setNewDoc({ name: '', description: '', icon: '📄', fee: 100 });
    setMessage(null);
  };

  const removeDocument = (code: string) => {
    if (draft.documents.length <= 1) return;
    const doc = draft.documents.find(item => item.code === code);
    if (doc && !window.confirm(`Remove "${doc.name}"? Students will no longer be able to request it.`)) return;
    setDraft(prev => ({ ...prev, documents: prev.documents.filter(item => item.code !== code) }));
  };

  const discard = () => {
    setDraft(cloneCatalog(saved));
    setMessage(null);
  };

  const save = async () => {
    const blank = draft.documents.find(item => !item.name.trim());
    if (blank) {
      setMessage({ type: 'error', text: 'Every document needs a name.' });
      return;
    }
    if (draft.documents.some(item => !Number.isFinite(Number(item.fee)) || Number(item.fee) < 0) || Number(draft.rushFee) < 0) {
      setMessage({ type: 'error', text: 'Prices must be 0 or higher.' });
      return;
    }

    const summary = changes.filter(item => item.kind !== 'details');
    setSaving(true);
    setMessage(null);
    try {
      const stored = await persistDocumentCatalog({
        ...draft,
        documents: draft.documents.map(item => ({ ...item, name: item.name.trim(), description: item.description.trim() })),
      });
      setSaved(cloneCatalog(stored));
      setDraft(cloneCatalog(stored));

      let notified = 0;
      let notifyFailed = false;
      if (notify && summary.length) {
        try {
          notified = await notifyAllStudents({
            type: 'price',
            title: summary.some(item => item.kind === 'price' || item.kind === 'rush') ? 'Document fees updated' : 'Document list updated',
            message: `Update from the Registrar: ${summary.map(item => item.label).join('; ')}.`,
            link: '/request',
          });
        } catch (err) {
          console.warn(err);
          notifyFailed = true;
        }
      }

      setMessage({
        type: notifyFailed ? 'error' : 'success',
        text: notifyFailed
          ? 'Prices saved, but notifications could not be sent. Students will still see the new prices.'
          : notify && summary.length
          ? `Prices saved. ${notified} student${notified === 1 ? '' : 's'} notified.`
          : 'Prices saved. Students now see the new prices.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? `Could not save: ${err.message}` : 'Could not save prices.' });
    } finally {
      setSaving(false);
    }
  };

  const savedByCode = new Map(saved.documents.map(item => [item.code, item]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-32">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Document Fees
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edit prices, then click <span className="font-semibold">Save changes</span>. Students see the new fees right away on the request page.
          Requests already submitted keep their original price.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-3 rounded-xl border flex items-start gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Rush processing fee</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Added on top of the document price when a student chooses Rush.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Number(saved.rushFee) !== Number(draft.rushFee) && (
              <span className="text-xs text-gray-400 line-through">{formatPeso(saved.rushFee)}</span>
            )}
            <span className="text-sm text-gray-500">₱</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={draft.rushFee}
              onChange={e => { setMessage(null); setDraft(prev => ({ ...prev, rushFee: e.target.value === '' ? 0 : Number(e.target.value) })); }}
              className={`w-28 ${inputClass}`}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Available documents
          </h2>
          {!loaded && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {draft.documents.map(doc => {
            const original = savedByCode.get(doc.code);
            const priceChanged = original && Number(original.fee) !== Number(doc.fee);
            const isNew = !original;
            return (
              <div
                key={doc.code}
                className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 ${
                  priceChanged || isNew ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                } ${!doc.available ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    value={doc.icon}
                    onChange={e => updateDoc(doc.code, { icon: e.target.value })}
                    aria-label="Icon"
                    className="w-11 text-2xl text-center bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={doc.name}
                        onChange={e => updateDoc(doc.code, { name: e.target.value })}
                        aria-label="Document name"
                        className="w-full bg-transparent font-medium text-gray-900 dark:text-white text-sm rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {isNew && <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">New</span>}
                    </div>
                    <input
                      value={doc.description}
                      onChange={e => updateDoc(doc.code, { description: e.target.value })}
                      aria-label="Description"
                      className="w-full bg-transparent text-xs text-gray-500 dark:text-gray-400 rounded px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>Price</span>
                    {priceChanged && (
                      <span className="text-xs text-gray-400 line-through">{formatPeso(original!.fee)}</span>
                    )}
                    <span>₱</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={doc.fee}
                      onChange={e => updateDoc(doc.code, { fee: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className={`w-24 ${inputClass} ${priceChanged ? 'ring-2 ring-amber-400' : ''}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updateDoc(doc.code, { available: !doc.available })}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                      doc.available
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                    }`}
                  >
                    {doc.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {doc.available ? 'Available' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.code)}
                    disabled={draft.documents.length <= 1}
                    aria-label={`Remove ${doc.name}`}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Add another document
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[70px_1fr_1fr_120px_auto] gap-3">
          <input
            value={newDoc.icon}
            onChange={e => setNewDoc({ ...newDoc, icon: e.target.value })}
            aria-label="Icon"
            className={`${inputClass} text-center text-lg`}
          />
          <input
            value={newDoc.name}
            onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
            placeholder="Name (e.g. Honorable Dismissal)"
            className={inputClass}
          />
          <input
            value={newDoc.description}
            onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
            placeholder="Short description"
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={newDoc.fee}
            onChange={e => setNewDoc({ ...newDoc, fee: Number(e.target.value) })}
            placeholder="Price"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addDocument}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-0 inset-x-0 lg:left-auto lg:right-0 lg:w-[calc(100%-15rem)] z-30 safe-area-pb">
          <div className="m-3 sm:m-4 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-2xl shadow-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-300 space-y-0.5 max-h-20 overflow-y-auto">
                  {changes.map(change => <li key={change.label}>• {change.label}</li>)}
                </ul>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={e => setNotify(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Bell className="w-3.5 h-3.5" />
                  Notify all students about this update
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
