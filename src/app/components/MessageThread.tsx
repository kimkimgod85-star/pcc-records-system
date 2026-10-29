import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pencil, Send, Trash2, X } from 'lucide-react';
import { btn } from '../lib/ui';
import { formatMessageTime } from '../lib/messageTime';
import { ProfileAvatar } from './ProfileAvatar';
import {
  MESSAGE_LIMIT,
  deleteConversation,
  deleteMessage,
  editMessage,
  fetchMessages,
  markThreadRead,
  sendMessage,
  subscribeMessages,
  type ChatMessage,
} from '../lib/messages';

export function MessageThread({
  conversationId,
  meId,
  asAdmin,
  peerName,
  peerAvatar,
  peerFit = 'cover',
  onDeleted,
}: {
  conversationId: string;
  meId: string;
  asAdmin: boolean;
  peerName: string;
  peerAvatar?: string | null;
  peerFit?: 'cover' | 'contain';
  onDeleted?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const load = () => {
    fetchMessages(conversationId)
      .then(setMessages)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load messages.'));
  };

  useEffect(() => {
    setEditingId(null);
    setConfirming(false);
    setError('');
    load();
    void markThreadRead(conversationId, asAdmin);
    return subscribeMessages(load);
  }, [conversationId, asAdmin]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendMessage(conversationId, meId, draft);
      setDraft('');
      await markThreadRead(conversationId, asAdmin);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (message: ChatMessage) => {
    setBusy(true);
    setError('');
    try {
      await editMessage(message.id, editDraft);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not edit the message.');
    } finally {
      setBusy(false);
    }
  };

  const removeMessage = async (id: string) => {
    setError('');
    try {
      await deleteMessage(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the message.');
    }
  };

  const removeThread = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteConversation(conversationId);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the conversation.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-800">
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 h-14 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <ProfileAvatar name={peerName} url={peerAvatar} fit={peerFit} className="w-9 h-9 text-sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{peerName}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{asAdmin ? 'Student' : 'Registrar’s Office'}</p>
          </div>
        </div>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className={btn('dangerOutline', 'sm')}>
            <Trash2 className="w-3.5 h-3.5" />
            Delete chat
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-700 dark:text-red-300">Delete for both?</span>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={btn('secondary', 'sm')}>No</button>
            <button type="button" onClick={removeThread} disabled={busy} className={btn('danger', 'sm')}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, delete'}
            </button>
          </div>
        )}
      </div>

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 bg-gray-50/70 dark:bg-slate-900/40">
        {messages.length === 0 && (
          <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No messages yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Say hello to {asAdmin ? peerName : 'the Registrar’s Office'}.
            </p>
          </div>
        )}
        {messages.map(message => {
          const mine = message.senderId === meId;
          const editing = editingId === message.id;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                mine
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-100 dark:bg-slate-700 dark:text-white dark:border-slate-600 rounded-bl-md'
              }`}>
                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value.slice(0, MESSAGE_LIMIT))}
                      rows={2}
                      className="w-full px-2 py-1.5 rounded-lg text-sm text-gray-900 bg-white"
                    />
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded-md bg-white/20" aria-label="Cancel edit"><X className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => saveEdit(message)} className="p-1 rounded-md bg-white text-blue-700" aria-label="Save edit"><Check className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                )}
                <div className={`mt-1 flex items-center gap-2 text-[10px] ${mine ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  <span>{formatMessageTime(message.createdAt)}{message.editedAt ? ' · edited' : ''}</span>
                  {mine && !editing && (
                    <span className="inline-flex gap-0.5 ml-auto">
                      <button
                        type="button"
                        aria-label="Edit message"
                        onClick={() => { setEditingId(message.id); setEditDraft(message.body); }}
                        className="p-0.5 rounded hover:bg-white/20"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button type="button" aria-label="Delete message" onClick={() => removeMessage(message.id)} className="p-0.5 rounded hover:bg-white/20">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-800">
        {error && <p className="text-xs text-center text-red-600 dark:text-red-400 mb-2">{error}</p>}
        <div className="flex items-stretch gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, MESSAGE_LIMIT))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={2}
            placeholder="Write a message"
            className="flex-1 min-w-0 h-12 sm:h-[4.5rem] px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" onClick={send} disabled={busy || !draft.trim()} aria-label="Send" className={btn('primary', 'md', '!h-12 sm:!h-[4.5rem] px-4')}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 text-center tabular-nums">{draft.length}/{MESSAGE_LIMIT}</p>
      </div>
    </div>
  );
}
