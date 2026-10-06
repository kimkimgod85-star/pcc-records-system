import { requireSupabase } from './supabase';
import { tableMissing } from './status';
import { subscribeLocalAndRemote } from './realtime';

const EVENT = 'pcc-documents-updated';

export interface CatalogDocument {
  code: string;
  name: string;
  description: string;
  icon: string;
  fee: number;
  available: boolean;
}

export interface DocumentCatalog {
  documents: CatalogDocument[];
  rushFee: number;
}

export const DEFAULT_DOCUMENTS: CatalogDocument[] = [
  { code: 'tor', name: 'Transcript of Records', description: 'Official academic transcript', icon: '📋', fee: 150, available: true },
  { code: 'coe', name: 'Certificate of Enrollment', description: 'Proof of current/past enrollment', icon: '📄', fee: 50, available: true },
  { code: 'diploma', name: 'Diploma Copy', description: 'Certified copy of diploma', icon: '🎓', fee: 200, available: true },
  { code: 'goodmoral', name: 'Good Moral Certificate', description: 'Certificate of good character', icon: '⭐', fee: 75, available: true },
];

export const DEFAULT_CATALOG: DocumentCatalog = {
  documents: DEFAULT_DOCUMENTS.map(item => ({ ...item })),
  rushFee: 100,
};

function cloneDefault(): DocumentCatalog {
  return {
    rushFee: 100,
    documents: DEFAULT_DOCUMENTS.map(item => ({ ...item })),
  };
}

let cached: DocumentCatalog = cloneDefault();

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function formatPeso(amount: number) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchDocumentCatalog(): Promise<DocumentCatalog> {
  try {
    const client = requireSupabase();
    const [{ data: docs, error: docsError }, { data: rush, error: rushError }] = await Promise.all([
      client.from('documents').select('*').order('sort_order'),
      client.from('app_settings').select('value').eq('key', 'rush_fee').maybeSingle(),
    ]);
    if (docsError) throw docsError;
    if (rushError) throw rushError;
    const documents = (docs || []).map((item, index) => ({
      code: String(item.code || `doc-${index}`),
      name: String(item.name || 'Document'),
      description: String(item.description || ''),
      icon: String(item.icon || '📄'),
      fee: Math.max(0, Number(item.fee) || 0),
      available: item.available !== false,
    }));
    cached = {
      documents: documents.length ? documents : cloneDefault().documents,
      rushFee: Math.max(0, Number(rush?.value ?? 100) || 0),
    };
    return cached;
  } catch (error) {
    if (!tableMissing(error)) console.warn(error);
    return cached;
  }
}

export async function persistDocumentCatalog(next: DocumentCatalog) {
  const catalog: DocumentCatalog = {
    rushFee: Math.max(0, Number(next.rushFee) || 0),
    documents: next.documents.map(item => ({
      ...item,
      fee: Math.max(0, Number(item.fee) || 0),
    })),
  };
  const client = requireSupabase();
  const { data: rushRows, error: rushError } = await client
    .from('app_settings')
    .upsert({ key: 'rush_fee', value: catalog.rushFee }, { onConflict: 'key' })
    .select('key');
  if (rushError) throw explainCatalogError(rushError);
  if (!rushRows?.length) throw explainCatalogError();

  const { data: savedDocs, error } = await client
    .from('documents')
    .upsert(
      catalog.documents.map((item, index) => ({
        code: item.code,
        name: item.name,
        description: item.description,
        icon: item.icon,
        fee: item.fee,
        available: item.available,
        sort_order: index + 1,
      })),
      { onConflict: 'code' },
    )
    .select('code');
  if (error) throw explainCatalogError(error);
  if ((savedDocs?.length || 0) < catalog.documents.length) throw explainCatalogError();

  const { data: existing, error: listError } = await client.from('documents').select('code');
  if (listError) throw explainCatalogError(listError);
  const keep = new Set(catalog.documents.map(item => item.code));
  const extras = (existing || []).map(item => item.code).filter(code => !keep.has(code));
  if (extras.length) {
    const { error: deleteError } = await client.from('documents').delete().in('code', extras);
    if (deleteError) throw explainCatalogError(deleteError);
  }

  cached = catalog;
  emit();
  return catalog;
}

function explainCatalogError(error?: { message?: string; code?: string }) {
  if (!error || error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
    return new Error('Your account is not allowed to change prices. Sign in with a Registrar/Admin account (role "admin" in the Supabase profiles table).');
  }
  return new Error(error.message || 'Could not save prices.');
}

/** Recomputes the amount of requests that have not been paid yet, so students pay the current price. */
export async function repriceUnpaidRequests(catalog: DocumentCatalog) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('document_requests')
    .select('id, document_code, document_name, quantity, urgency, amount, payment_status, status')
    .in('payment_status', ['unpaid', 'rejected', 'pay_later'])
    .not('status', 'in', '(rejected,completed)');
  if (error) throw error;

  let updated = 0;
  for (const row of data || []) {
    const doc = catalog.documents.find(item => item.code === row.document_code || item.name === row.document_name);
    if (!doc) continue;
    const amount = doc.fee * Math.max(1, Number(row.quantity) || 1) + (row.urgency === 'rush' ? catalog.rushFee : 0);
    if (Number(row.amount) === amount) continue;
    const { error: updateError } = await client
      .from('document_requests')
      .update({ amount, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) throw updateError;
    updated++;
  }
  return updated;
}

export interface CatalogChange {
  kind: 'price' | 'rush' | 'added' | 'removed' | 'hidden' | 'shown' | 'renamed' | 'details';
  label: string;
}

export function describeCatalogChanges(before: DocumentCatalog, after: DocumentCatalog): CatalogChange[] {
  const changes: CatalogChange[] = [];
  const oldByCode = new Map(before.documents.map(item => [item.code, item]));
  const newCodes = new Set(after.documents.map(item => item.code));

  after.documents.forEach(doc => {
    const old = oldByCode.get(doc.code);
    if (!old) {
      changes.push({ kind: 'added', label: `New: ${doc.name} – ${formatPeso(doc.fee)}` });
      return;
    }
    if (old.name.trim() !== doc.name.trim()) {
      changes.push({ kind: 'renamed', label: `${old.name} is now called ${doc.name}` });
    }
    if (old.description.trim() !== doc.description.trim() || old.icon !== doc.icon) {
      changes.push({ kind: 'details', label: `${doc.name}: description or icon updated` });
    }
    if (Number(old.fee) !== Number(doc.fee)) {
      changes.push({ kind: 'price', label: `${doc.name}: ${formatPeso(old.fee)} → ${formatPeso(doc.fee)}` });
    }
    if (old.available && !doc.available) {
      changes.push({ kind: 'hidden', label: `${doc.name} is temporarily unavailable` });
    } else if (!old.available && doc.available) {
      changes.push({ kind: 'shown', label: `${doc.name} is available again – ${formatPeso(doc.fee)}` });
    }
  });

  before.documents.forEach(old => {
    if (!newCodes.has(old.code)) changes.push({ kind: 'removed', label: `${old.name} was removed` });
  });

  if (Number(before.rushFee) !== Number(after.rushFee)) {
    changes.push({ kind: 'rush', label: `Rush fee: ${formatPeso(before.rushFee)} → ${formatPeso(after.rushFee)}` });
  }

  return changes;
}

export function loadDocumentCatalog(): DocumentCatalog {
  return cached;
}

export function saveDocumentCatalog(next: DocumentCatalog) {
  void persistDocumentCatalog(next);
  cached = {
    rushFee: Math.max(0, Number(next.rushFee) || 0),
    documents: next.documents.map(item => ({ ...item, fee: Math.max(0, Number(item.fee) || 0) })),
  };
  emit();
  return cached;
}

export function subscribeDocumentCatalog(onChange: () => void) {
  return subscribeLocalAndRemote(EVENT, ['documents', 'app_settings'], onChange);
}

export function getAvailableDocuments(catalog = cached) {
  return catalog.documents.filter(item => item.available);
}

export function getDocumentByCode(code: string, catalog = cached) {
  return catalog.documents.find(item => item.code === code) || null;
}

export function getFeeByName(name: string, catalog = cached) {
  const match = catalog.documents.find(item => item.name === name || item.code === name);
  return match?.fee ?? 0;
}

export function getRushFee(catalog = cached) {
  return catalog.rushFee;
}

export function computeRequestTotal(code: string, quantity: number, urgency: 'regular' | 'rush', catalog = cached) {
  const doc = catalog.documents.find(item => item.code === code);
  const base = (doc?.fee || 0) * Math.max(1, quantity);
  const rush = urgency === 'rush' ? catalog.rushFee : 0;
  return { base: doc?.fee || 0, rush, total: base + rush };
}

export function priceCaption(catalog = cached) {
  const parts = catalog.documents
    .filter(item => item.available)
    .map(item => `${item.code.toUpperCase()} ${formatPeso(item.fee)}`);
  return `Current fees: ${parts.join(', ')}, rush +${formatPeso(catalog.rushFee)}.`;
}
