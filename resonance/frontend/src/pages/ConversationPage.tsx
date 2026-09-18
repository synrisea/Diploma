import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useCreateConversation } from '../hooks/useCreateConversation';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useBlockUser } from '../hooks/useBlockUser';
import { BackLink } from '../components/layout/BackLink';

const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';
const primaryButtonClass =
  'rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const dangerLinkButtonClass =
  'text-sm font-medium text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const recipientId = searchParams.get('with') ?? undefined;
  const visitIntentId = searchParams.get('intentId') ?? undefined;
  const navigate = useNavigate();
  const { userId: myUserId } = useAuth();

  const [draft, setDraft] = useState('');
  const { data: messages = [] } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId ?? '');
  const createConversation = useCreateConversation();
  const blockUser = useBlockUser();
  const { data: profile } = usePublicProfile(recipientId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (!recipientId) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <BackLink to="/inbox" />
        <p className="mx-auto max-w-2xl text-sm text-stone-500">Couldn't find who to message.</p>
      </div>
    );
  }

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (conversationId) {
      sendMessage.mutate(trimmed, { onSuccess: () => setDraft('') });
    } else {
      createConversation.mutate(
        { recipientUserId: recipientId, initialMessage: trimmed, visitIntentId },
        {
          onSuccess: (result) => {
            setDraft('');
            navigate(`/messages/${result.conversationId}?with=${recipientId}`, { replace: true });
          },
        },
      );
    }
  };

  const isSending = sendMessage.isPending || createConversation.isPending;
  const errorMessage =
    sendMessage.error instanceof Error ? sendMessage.error.message : createConversation.error instanceof Error ? createConversation.error.message : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-6 py-10">
      <BackLink to="/inbox" />
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-stone-900/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-sm font-medium text-brand-ink">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile?.displayName ?? '?').charAt(0).toUpperCase()
              )}
            </div>
            <p className="font-display text-lg text-stone-900">{profile?.displayName ?? 'Loading…'}</p>
          </div>
          <button
            type="button"
            onClick={() => recipientId && blockUser.mutate(recipientId)}
            disabled={blockUser.isPending}
            className={dangerLinkButtonClass}
          >
            {blockUser.isPending ? 'Blocking…' : blockUser.isSuccess ? 'Blocked' : 'Block'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col gap-2">
            {messages.map((message) => {
              const isMine = message.senderId === myUserId;
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      isMine ? 'bg-brand-500 text-brand-ink' : 'border border-stone-900/10 bg-stone-900/[0.025] text-stone-700'
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {blockUser.isSuccess ? (
          <p className="border-t border-stone-900/10 pt-4 text-sm text-stone-500">You've blocked this person — they can no longer message you.</p>
        ) : (
          <div className="flex flex-col gap-2 border-t border-stone-900/10 pt-4">
            {errorMessage && <p className="text-sm text-sentiment-negative">{errorMessage}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type a message…"
                maxLength={2000}
                className={`flex-1 ${inputClass}`}
              />
              <button type="button" onClick={handleSend} disabled={isSending} className={primaryButtonClass}>
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
