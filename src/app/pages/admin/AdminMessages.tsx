import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MessageThread } from '../../components/MessageThread';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { formatMessageTime } from '../../lib/messageTime';
import { fetchInbox, openStudentThread, subscribeMessages, type InboxThread } from '../../lib/messages';

export default function AdminMessages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const studentParam = params.get('student');
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetchInbox().then(setThreads).catch(err => setError(err instanceof Error ? err.message : 'Could not load messages.'));
  };

  useEffect(() => {
    load();
    return subscribeMessages(load);
  }, []);

  useEffect(() => {
    if (!studentParam) return;
    openStudentThread(studentParam)
      .then(id => setActiveId(id))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not open that student.'));
  }, [studentParam]);

  const active = threads.find(thread => thread.id === activeId) || null;

  const open = (thread: InboxThread) => {
    setActiveId(thread.id);
    setParams({}, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-5">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Messages
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          One conversation per student. Every admin sees the same inbox.
        </p>
      </div>

      {error && <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mx-auto grid lg:grid-cols-5 gap-4 h-[min(40rem,calc(100dvh-12rem))]">
        <div className={`${activeId ? 'hidden lg:flex' : 'flex'} lg:col-span-2 flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden`}>
          <div className="px-4 h-12 flex items-center border-b border-gray-100 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white">
            {threads.length} conversation{threads.length === 1 ? '' : 's'}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {threads.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No messages yet.</p>
            )}
            {threads.map(thread => (
              <button
                key={thread.id}
                type="button"
                onClick={() => open(thread)}
                className={`w-full h-[4.25rem] text-left px-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700 ${
                  activeId === thread.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <ProfileAvatar name={thread.studentName} url={thread.avatarUrl} className="w-9 h-9 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{thread.studentName}</p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatMessageTime(thread.lastAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{thread.lastBody || 'No messages yet'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`${activeId ? 'flex' : 'hidden lg:flex'} lg:col-span-3 flex-col rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden`}>
          {activeId && (
            <button type="button" onClick={() => { setActiveId(null); setParams({}, { replace: true }); }} className="lg:hidden px-4 h-10 text-left text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
              Back to conversations
            </button>
          )}
          {user && active ? (
            <MessageThread
              conversationId={active.id}
              meId={user.id}
              asAdmin
              peerName={active.studentName}
              peerAvatar={active.avatarUrl}
              onDeleted={() => { setActiveId(null); load(); }}
            />
          ) : user && activeId && !active ? (
            <MessageThread
              conversationId={activeId}
              meId={user.id}
              asAdmin
              peerName="Student"
              onDeleted={() => { setActiveId(null); setParams({}, { replace: true }); load(); }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 bg-white dark:bg-slate-800">
              <MessageSquare className="w-8 h-8" />
              <p className="text-sm">Select a student to read the conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
