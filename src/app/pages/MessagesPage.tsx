import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MessageThread } from '../components/MessageThread';
import { openStudentThread } from '../lib/messages';
import { withBase } from '../lib/basePath';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!user) return;
    setGone(false);
    openStudentThread(user.id)
      .then(setConversationId)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not open messages.'));
  }, [user?.id, gone]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-5">
        <h1 className="text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 600 }}>
          Messages
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Message the Registrar’s Office directly. Staff share this inbox.
        </p>
      </div>

      <div className="mx-auto h-[calc(100dvh-16.5rem)] sm:h-[min(38rem,calc(100dvh-14rem))] min-h-[22rem] rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {error && (
          <div className="h-full flex items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {!error && !conversationId && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <MessageSquare className="w-8 h-8" />
            <p className="text-sm">Opening your conversation…</p>
          </div>
        )}
        {user && conversationId && (
          <MessageThread
            conversationId={conversationId}
            meId={user.id}
            asAdmin={false}
            peerName="Registrar’s Office"
            peerAvatar={withBase('PCC%20LOGO.png')}
            peerFit="contain"
            onDeleted={() => { setConversationId(null); setGone(true); }}
          />
        )}
      </div>
    </div>
  );
}
