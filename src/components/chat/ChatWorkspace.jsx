import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChatConversation,
  listChatConversations,
  listChatMessages,
  markChatConversationRead,
  sendChatMessage,
  setChatConversationClosed
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-NP', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function ChatWorkspace({
  kind = '',
  title = 'Messages',
  description = 'Open a conversation and continue the discussion.',
  autoStartPayload = null,
  emptyTitle = 'No conversations yet',
  emptyDescription = 'Messages will appear here once a conversation is started.',
  allowClose = false,
  pollMs = 12000,
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const autoStartKeyRef = useRef('');
  const messagesEndRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  async function loadConversations({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const items = await listChatConversations(kind ? { kind } : {});
      setConversations((current) => {
        const merged = [...items];
        current.forEach((conversation) => {
          if (!merged.some((item) => item.id === conversation.id)) {
            merged.push(conversation);
          }
        });
        return merged;
      });
      setActiveConversationId((current) => current || items[0]?.id || null);
    } catch (error) {
      setStatus(error?.message || 'Could not load conversations.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadMessages(conversationId, { silent = false } = {}) {
    if (!conversationId) return;
    if (!silent) setThreadLoading(true);
    try {
      const [items] = await Promise.all([
        listChatMessages(conversationId),
        markChatConversationRead(conversationId),
      ]);
      setMessages(items);
      setConversations((current) =>
        current.map((item) => (item.id === conversationId ? { ...item, unread_count: 0 } : item))
      );
    } catch (error) {
      setStatus(error?.message || 'Could not load messages.');
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [kind]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!autoStartPayload) return;
    const key = JSON.stringify(autoStartPayload);
    if (autoStartKeyRef.current === key) return;
    autoStartKeyRef.current = key;
    createChatConversation(autoStartPayload)
      .then((conversation) => {
        setConversations((current) => {
          const existing = current.find((item) => item.id === conversation.id);
          if (existing) {
            return current.map((item) => (item.id === conversation.id ? conversation : item));
          }
          return [conversation, ...current];
        });
        setActiveConversationId(conversation.id);
        loadMessages(conversation.id, { silent: true });
      })
      .catch((error) => {
        setStatus(error?.payload?.detail || error?.message || 'Could not start the conversation.');
      });
  }, [autoStartPayload]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadConversations({ silent: true });
      if (activeConversationId) {
        loadMessages(activeConversationId, { silent: true });
      }
    }, pollMs);
    return () => window.clearInterval(interval);
  }, [activeConversationId, kind, pollMs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!activeConversationId || !messageBody.trim()) return;
    setSending(true);
    setStatus('');
    try {
      const formData = new FormData();
      formData.append('conversation', activeConversationId);
      formData.append('body', messageBody.trim());
      if (attachment) formData.append('attachment', attachment);
      const created = await sendChatMessage(formData);
      setMessages((current) => [...current, created]);
      setConversations((current) =>
        current.map((item) =>
          item.id === activeConversationId
            ? { ...item, last_message: created, last_message_preview: created.body, last_message_at: created.created_at }
            : item
        )
      );
      setMessageBody('');
      setAttachment(null);
    } catch (error) {
      setStatus(error?.payload?.detail || error?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleToggleClosed() {
    if (!activeConversation) return;
    setStatus('');
    try {
      const updated = await setChatConversationClosed(activeConversation.id, !activeConversation.is_closed);
      setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setStatus(error?.payload?.detail || error?.message || 'Could not update conversation status.');
    }
  }

  return (
    <div className="chat-workspace">
      <div className="chat-workspace__header">
        <div>
          <span className="section-eyebrow">In-App Chat</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {status ? <div className="alert alert-info mb-3">{status}</div> : null}

      <div className="chat-workspace__layout">
        <aside className="chat-workspace__sidebar table-card">
          {loading ? (
            <div className="empty-state-sm">Loading conversations...</div>
          ) : conversations.length ? (
            <div className="chat-conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`chat-conversation-card ${activeConversationId === conversation.id ? 'active' : ''}`}
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div className="chat-conversation-card__head">
                    <strong>
                      {conversation.counterparty_detail?.brand_name ||
                        conversation.counterparty_detail?.full_name ||
                        conversation.counterparty_detail?.email ||
                        'Conversation'}
                    </strong>
                    {conversation.unread_count ? <span className="tool-badge">{conversation.unread_count}</span> : null}
                  </div>
                  <span>{conversation.context_summary}</span>
                  <p>{conversation.last_message_preview || 'No messages yet.'}</p>
                  <small>{formatTimestamp(conversation.last_message_at || conversation.updated_at)}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="filter-empty-state h-100">
              <h4>{emptyTitle}</h4>
              <p>{emptyDescription}</p>
            </div>
          )}
        </aside>

        <div className="chat-workspace__thread table-card">
          {activeConversation ? (
            <>
              <div className="chat-thread__head">
                <div>
                  <strong>
                    {activeConversation.counterparty_detail?.brand_name ||
                      activeConversation.counterparty_detail?.full_name ||
                      activeConversation.counterparty_detail?.email ||
                      'Conversation'}
                  </strong>
                  <span>{activeConversation.context_summary}</span>
                </div>
                {allowClose ? (
                  <button type="button" className="btn btn-sm btn-slessaa btn-slessaa-outline" onClick={handleToggleClosed}>
                    {activeConversation.is_closed ? 'Reopen' : 'Close'}
                  </button>
                ) : activeConversation.is_closed ? (
                  <span className="status-pill status-completed">Closed</span>
                ) : null}
              </div>

              <div className="chat-thread__messages">
                {threadLoading && !messages.length ? (
                  <div className="empty-state-sm">Loading messages...</div>
                ) : messages.length ? (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-bubble ${message.sender_user_id === user?.id ? 'current-user' : 'partner'}`}
                    >
                      <div className="chat-bubble__meta">
                        <strong>{message.sender_detail?.full_name || message.sender_detail?.email}</strong>
                        <span>{formatTimestamp(message.created_at)}</span>
                      </div>
                      <p>{message.body}</p>
                      {message.attachment ? (
                        <a href={message.attachment} target="_blank" rel="noreferrer">
                          View attachment
                        </a>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="empty-state-sm">No messages in this thread yet.</div>
                )}
                <div ref={messagesEndRef}></div>
              </div>

              {activeConversation.is_closed ? (
                <div className="empty-state-sm">This conversation is closed. Reopen it before sending another reply.</div>
              ) : (
                <form className="chat-thread__composer" onSubmit={handleSendMessage}>
                  <textarea
                    className="form-control premium-input premium-textarea"
                    rows="3"
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    placeholder="Write your message..."
                  ></textarea>
                  <div className="chat-thread__composer-actions">
                    <input type="file" accept="image/*,.pdf" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
                    <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={sending || !messageBody.trim()}>
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="filter-empty-state h-100">
              <h4>Select a conversation</h4>
              <p>Choose a thread from the list to view the conversation history and send replies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatWorkspace;
