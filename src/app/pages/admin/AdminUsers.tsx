import { useEffect, useState, type ReactNode } from 'react';
import {
  Search, UserX, UserCheck, Mail, X, ChevronRight, Loader2, AlertCircle,
  Users, GraduationCap, Award, Copy, Check, FileText, IdCard, CalendarDays,
  Pencil, Save, CheckCircle,
} from 'lucide-react';
import { fetchManagedUsers, setUserStatus, subscribeUsers, updateManagedUser, type ManagedUser } from '../../lib/profiles';
import { fetchRequests, subscribeRequests, type StudentRequest } from '../../lib/requests';
import { formatShortDate } from '../../lib/status';
import { useRevealOnSmallScreen } from '../../lib/useRevealOnSmallScreen';
import { StatusBadge } from '../../components/StatusBadge';

type RoleFilter = 'all' | 'student' | 'alumni';
type StatusFilter = 'all' | 'active' | 'inactive';

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'student', label: 'Students' },
  { value: 'alumni', label: 'Alumni' },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const inputClass =
  'w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

function NoIdTag() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
      No ID
    </span>
  );
}

function RoleTag({ role }: { role: string }) {
  const student = role === 'student';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
      student
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    }`}>
      {student ? <GraduationCap className="w-3 h-3" /> : <Award className="w-3 h-3" />}
      {role}
    </span>
  );
}

function AccountBadge({ status }: { status: ManagedUser['status'] }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ring-1 ring-inset ${
      active
        ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30'
        : 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-slate-700 dark:text-gray-300 dark:ring-slate-500/40'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Avatar({ name, size = 'md', inactive }: { name: string; size?: 'md' | 'lg'; inactive?: boolean }) {
  return (
    <div className={`${size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'} rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${
      inactive
        ? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }`}>
      {initials(name)}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [missingIdOnly, setMissingIdOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; studentId: string; role: 'student' | 'alumni' }>({ name: '', studentId: '', role: 'student' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [saved, setSaved] = useState(false);
  const detailRef = useRevealOnSmallScreen<HTMLDivElement>(selectedId ?? undefined);

  useEffect(() => {
    fetchManagedUsers().then(setUsers);
    return subscribeUsers(() => { fetchManagedUsers().then(setUsers); });
  }, []);

  useEffect(() => {
    const refresh = () => { fetchRequests().then(setRequests); };
    refresh();
    return subscribeRequests(refresh);
  }, []);

  const selected = users.find(u => u.id === selectedId) ?? null;
  const selectedRequests = selected ? requests.filter(r => r.userId === selected.id) : [];

  const query = search.trim().toLowerCase();
  const filtered = users.filter(u => {
    const matchSearch = !query ||
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.studentId.toLowerCase().includes(query);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus && (!missingIdOnly || !u.studentId.trim());
  });
  const missingIdCount = users.filter(u => !u.studentId.trim()).length;

  const activeCount = users.filter(u => u.status === 'active').length;
  const studentCount = users.filter(u => u.role === 'student').length;
  const alumniCount = users.filter(u => u.role === 'alumni').length;

  const select = (id: string) => {
    setSelectedId(id);
    setConfirming(false);
    setError('');
    setCopied(false);
    setEditing(false);
    setSaved(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft({
      name: selected.name,
      studentId: selected.studentId,
      role: selected.role === 'alumni' ? 'alumni' : 'student',
    });
    setEditError('');
    setSaved(false);
    setEditing(true);
  };

  const saveEdit = async (user: ManagedUser) => {
    const name = draft.name.trim().replace(/\s+/g, ' ');
    const studentId = draft.studentId.trim();
    if (name.length < 2) {
      setEditError('Please enter the full name.');
      return;
    }
    if (studentId && users.some(u => u.id !== user.id && u.studentId.toLowerCase() === studentId.toLowerCase())) {
      setEditError('Another user already has this student ID.');
      return;
    }
    setSavingEdit(true);
    setEditError('');
    try {
      await updateManagedUser(user.id, { name, studentId, role: draft.role });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, name, studentId, role: draft.role } : u));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save the changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const changeStatus = async (user: ManagedUser) => {
    const next = user.status === 'active' ? 'inactive' : 'active';
    setSaving(true);
    setError('');
    try {
      await setUserStatus(user.id, next);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: next } : u));
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          User Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Look up students and alumni, check their requests, and turn accounts on or off.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <SummaryCard icon={Users} label="Total users" value={users.length} tone="blue" onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }} />
        <SummaryCard icon={UserCheck} label="Active" value={activeCount} tone="green" onClick={() => setStatusFilter('active')} />
        <SummaryCard icon={GraduationCap} label="Students" value={studentCount} tone="indigo" onClick={() => setRoleFilter('student')} />
        <SummaryCard icon={Award} label="Alumni" value={alumniCount} tone="purple" onClick={() => setRoleFilter('alumni')} />
      </div>

      {/* Search + filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-3 sm:p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or student ID"
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Segmented options={ROLE_TABS} value={roleFilter} onChange={setRoleFilter} />
          <Segmented options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
          {missingIdCount > 0 && (
            <button
              type="button"
              onClick={() => setMissingIdOnly(v => !v)}
              aria-pressed={missingIdOnly}
              className={`sm:ml-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                missingIdOnly
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
              }`}
            >
              No Student ID ({missingIdCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* List */}
        <div className={`${selected ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden`}>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No users match your search.</div>
          )}

          {/* Phone: cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => select(user.id)}
                className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors ${
                  selectedId === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'active:bg-gray-50 dark:active:bg-slate-700/50'
                }`}
              >
                <Avatar name={user.name} inactive={user.status === 'inactive'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{user.name}</p>
                    <AccountBadge status={user.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-0.5">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <RoleTag role={user.role} />
                    {!user.studentId.trim() && <NoIdTag />}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.requests} request{user.requests === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tablet & desktop: table */}
          {filtered.length > 0 && (
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-5 py-3">User</th>
                    <th className={`px-5 py-3 ${selected ? 'hidden' : 'hidden md:table-cell'}`}>Student ID</th>
                    <th className="px-5 py-3">Role</th>
                    <th className={`px-5 py-3 text-center ${selected ? 'hidden' : 'hidden lg:table-cell'}`}>Requests</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtered.map(user => {
                    const active = selectedId === user.id;
                    return (
                      <tr
                        key={user.id}
                        onClick={() => select(user.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={user.name} inactive={user.status === 'inactive'} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-5 py-3.5 ${selected ? 'hidden' : 'hidden md:table-cell'}`}>
                          {user.studentId.trim()
                            ? <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{user.studentId}</span>
                            : <NoIdTag />}
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleTag role={user.role} />
                        </td>
                        <td className={`px-5 py-3.5 text-center ${selected ? 'hidden' : 'hidden lg:table-cell'}`}>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">{user.requests}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <AccountBadge status={user.status} />
                        </td>
                        <td className="pr-4 py-3.5">
                          <ChevronRight className={`w-4 h-4 ${active ? 'text-blue-500' : 'text-gray-300 dark:text-slate-600'}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div ref={detailRef} className="lg:col-span-2 lg:sticky lg:top-6 space-y-4 scroll-mt-16">
            {/* Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-start gap-4 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <Avatar name={selected.name} size="lg" inactive={selected.status === 'inactive'} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {selected.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <RoleTag role={selected.role} />
                    <AccountBadge status={selected.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close details"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {saved && !editing && (
                <div className="mx-5 mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">Details saved.</p>
                </div>
              )}

              {editing ? (
                <form onSubmit={e => { e.preventDefault(); saveEdit(selected); }} className="px-5 py-4 space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
                    <input
                      id="edit-name"
                      type="text"
                      value={draft.name}
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      autoFocus
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-sid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                    <input
                      id="edit-sid"
                      type="text"
                      value={draft.studentId}
                      onChange={e => setDraft(d => ({ ...d, studentId: e.target.value }))}
                      placeholder="e.g. 2021-00123"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</span>
                    <Segmented
                      options={[{ value: 'student', label: 'Student' }, { value: 'alumni', label: 'Alumni' }]}
                      value={draft.role}
                      onChange={role => setDraft(d => ({ ...d, role }))}
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</span>
                    <p className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400 break-all">
                      {selected.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The email is the student’s login, so it can’t be changed here.</p>
                  </div>

                  {editError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-300">{editError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      disabled={savingEdit}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-700 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save changes
                    </button>
                  </div>
                </form>
              ) : (
              <dl className="divide-y divide-gray-100 dark:divide-slate-700">
                <InfoRow icon={Mail} label="Email">
                  <span className="break-all">{selected.email}</span>
                  <button
                    type="button"
                    onClick={() => copyEmail(selected.email)}
                    className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline align-middle"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </InfoRow>
                <InfoRow icon={IdCard} label="Student ID">
                  <span className="font-mono">{selected.studentId || '—'}</span>
                </InfoRow>
                <InfoRow icon={CalendarDays} label="Joined">{selected.joined}</InfoRow>
              </dl>
              )}
            </div>

            {/* Requests */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Requests
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{selectedRequests.length}</span>
              </div>
              {selectedRequests.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <FileText className="w-5 h-5 mx-auto text-gray-300 dark:text-slate-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">No requests yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {selectedRequests.slice(0, 8).map(req => (
                    <li key={req.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{req.type}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{req.id}</span> · {formatShortDate(req.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Account actions
              </h3>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <a
                href={`mailto:${selected.email}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Send email
              </a>

              {selected.status === 'active' ? (
                confirming ? (
                  <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-900/15">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Deactivate {selected.name.split(' ')[0]}’s account?</p>
                    <p className="text-sm text-red-700/90 dark:text-red-300/90 mt-0.5">They won’t be able to sign in or send new requests until you activate it again.</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-600 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus(selected)}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                        Deactivate
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    Deactivate account
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => changeStatus(selected)}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Activate account
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TONE = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

function SummaryCard({ icon: Icon, label, value, tone, onClick }: {
  icon: typeof Users; label: string; value: number; tone: keyof typeof TONE; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
    >
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0 ${TONE[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {value}
        </p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{label}</p>
      </div>
    </button>
  );
}

function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-slate-900 w-full sm:w-auto">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 leading-snug">{children}</dd>
      </div>
    </div>
  );
}
