import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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

function getDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDateSeparator(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (getDateKey(date) === getDateKey(today)) return 'Today';
  if (getDateKey(date) === getDateKey(yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-NP', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function ChatWorkspace({
  kind = '',
  title = 'Messages',
  description = 'Open a conversation and continue the discussion.',
  autoStartPayload = null,
  initialConversationId = null,
  onConversationSelect = null,
  onConversationStarted = null,
  onBack = null,
  showHeader = true,
  showThread = true,
  detailMode = false,
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
  const fileInputRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0),
    [conversations]
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
      if (showThread) {
        setActiveConversationId((current) => {
          if (initialConversationId && items.some((item) => String(item.id) === String(initialConversationId))) {
            return Number(initialConversationId);
          }
          return current || items[0]?.id || null;
        });
      }
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
  }, [kind, showThread]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(Number(initialConversationId));
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!showThread || !activeConversationId) {
      setMessages([]);
      return;
    }
    loadMessages(activeConversationId);
  }, [activeConversationId, showThread]);

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
        onConversationStarted?.(conversation);
        loadMessages(conversation.id, { silent: true });
      })
      .catch((error) => {
        setStatus(error?.payload?.detail || error?.message || 'Could not start the conversation.');
      });
  }, [autoStartPayload]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadConversations({ silent: true });
      if (showThread && activeConversationId) {
        loadMessages(activeConversationId, { silent: true });
      }
    }, pollMs);
    return () => window.clearInterval(interval);
  }, [activeConversationId, kind, pollMs, showThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSendMessage(event) {
    event?.preventDefault();
    if (!activeConversationId || !messageBody.trim()) return;

    const body = messageBody.trim();
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      conversation_id: activeConversationId,
      sender_id: user?.id,
      sender_user_id: user?.id,
      sender_role: user?.role || '',
      sender_detail: user || {},
      body,
      attachment: '',
      created_at: new Date().toISOString(),
      is_read: true,
      is_pending: true
    };

    setSending(true);
    setStatus('');
    setMessageBody('');
    setMessages((current) => [...current, optimisticMessage]);
    setConversations((current) =>
      current.map((item) =>
        item.id === activeConversationId
          ? { ...item, last_message: optimisticMessage, last_message_preview: body, last_message_at: optimisticMessage.created_at }
          : item
      )
    );

    try {
      const formData = new FormData();
      formData.append('conversation', activeConversationId);
      formData.append('body', body);
      if (attachment) formData.append('attachment', attachment);
      const created = await sendChatMessage(formData);
      setMessages((current) => current.map((item) => (item.id === optimisticId ? created : item)));
      setConversations((current) =>
        current.map((item) =>
          item.id === activeConversationId
            ? { ...item, last_message: created, last_message_preview: created.body, last_message_at: created.created_at }
            : item
        )
      );
      setAttachment(null);
    } catch (error) {
      setMessages((current) =>
        current.map((item) => (item.id === optimisticId ? { ...item, is_pending: false, is_failed: true } : item))
      );
      setStatus(error?.payload?.detail || error?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(event);
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

  function handleConversationClick(conversation) {
    if (onConversationSelect) {
      onConversationSelect(conversation);
      return;
    }
    setActiveConversationId(conversation.id);
  }

  function getConversationName(conversation) {
    return conversation.counterparty_detail?.brand_name ||
      conversation.counterparty_detail?.full_name ||
      conversation.counterparty_detail?.email ||
      'Conversation';
  }

  function getConversationTypeLabel(conversation) {
    if (conversation?.conversation_type === 'tailor_chat' || conversation?.kind === 'customer_tailor') return 'Tailor chat';
    if (conversation?.kind === 'vendor_admin') return 'Admin support';
    return 'Vendor chat';
  }

  function getSafetyNotice(conversation) {
    if (conversation?.conversation_type === 'tailor_chat' || conversation?.kind === 'customer_tailor') {
      return {
        title: 'Keep custom order details protected',
        body: 'Share measurements, design notes, and fitting updates here. Order changes and payments must stay inside the official Slessaa flow.'
      };
    }
    if (conversation?.kind === 'vendor_admin') {
      return {
        title: 'Platform support conversation',
        body: 'Use this thread for account, shop, payout, or operational support. Keep sensitive credentials out of chat.'
      };
    }
    return {
      title: 'Shop safely on Slessaa',
      body: 'Do not share passwords, card details, or private payment codes. All official payments must happen through Slessaa checkout.'
    };
  }

  function renderContextChips(conversation) {
    if (!conversation) return null;
    const chips = [];
    if (conversation.product_detail?.name) chips.push(`Product: ${conversation.product_detail.name}`);
    if (conversation.order_detail?.order_number) chips.push(`Order: ${conversation.order_detail.order_number}`);
    if (conversation.tailoring_request_detail?.clothing_type) chips.push(`Custom: ${conversation.tailoring_request_detail.clothing_type}`);
    if (!chips.length && conversation.context_summary) chips.push(conversation.context_summary);
    return (
      <div className="chat-detail-context-row">
        {chips.slice(0, 3).map((chip) => <span key={chip}>{chip}</span>)}
      </div>
    );
  }

  function renderMessageList() {
    if (threadLoading && !messages.length) {
      return <div className="empty-state-sm">Loading messages...</div>;
    }
    if (!messages.length) {
      return (
        <div className="chat-detail-empty">
          <h4>No messages yet</h4>
          <p>Send the first message to start this conversation.</p>
        </div>
      );
    }

    let previousDate = '';
    return messages.map((message) => {
      const currentDate = getDateKey(message.created_at);
      const showDate = currentDate && currentDate !== previousDate;
      previousDate = currentDate || previousDate;
      const isCurrentUser = message.sender_user_id === user?.id || message.sender_id === user?.id;
      return (
        <Fragment key={message.id}>
          {showDate ? <div className="chat-date-separator"><span>{formatDateSeparator(message.created_at)}</span></div> : null}
          <article className={`chat-bubble ${isCurrentUser ? 'current-user' : 'partner'} ${message.is_failed ? 'failed' : ''}`}>
            <div className="chat-bubble__meta">
              <strong>{isCurrentUser ? 'You' : (message.sender_detail?.full_name || message.sender_detail?.email || message.sender_role || 'Slessaa')}</strong>
              <span>{formatTimestamp(message.created_at)}</span>
            </div>
            <p>{message.body}</p>
            {message.attachment ? (
              <a href={message.attachment} target="_blank" rel="noreferrer">
                View attachment
              </a>
            ) : null}
            {message.is_pending ? <small className="chat-message-state">Sending...</small> : null}
            {message.is_failed ? <small className="chat-message-state">Could not send. Try again.</small> : null}
          </article>
        </Fragment>
      );
    });
  }

  function renderThread() {
    if (!activeConversation) {
      return (
        <div className="filter-empty-state h-100">
          <h4>{loading ? 'Loading conversation' : 'Open a conversation'}</h4>
          <p>{loading ? 'Preparing the latest messages.' : 'Choose a chat thread to view messages, context, and replies.'}</p>
        </div>
      );
    }

    const notice = getSafetyNotice(activeConversation);
    const participantName = getConversationName(activeConversation);

    return (
      <>
        <div className="chat-detail-header">
          <div className="chat-detail-header__main">
            {onBack ? (
              <button type="button" className="chat-detail-back" aria-label="Back to chats" onClick={onBack}>
                <i className="bi bi-arrow-left"></i>
              </button>
            ) : null}
            <span className="chat-avatar">{participantName.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{participantName}</strong>
              <span>{getConversationTypeLabel(activeConversation)}</span>
            </div>
          </div>
          <div className="chat-detail-header__actions">
            {activeConversation.order_detail && ['delivered', 'completed'].includes(String(activeConversation.order_detail.status || '').toLowerCase()) ? (
              <button type="button" className="btn btn-sm btn-slessaa btn-slessaa-outline">Rate Service</button>
            ) : null}
            {allowClose ? (
              <button type="button" className="btn btn-sm btn-slessaa btn-slessaa-outline" onClick={handleToggleClosed}>
                {activeConversation.is_closed ? 'Reopen' : 'Close'}
              </button>
            ) : activeConversation.is_closed ? (
              <span className="status-pill status-completed">Closed</span>
            ) : (
              <button type="button" className="chat-detail-menu" aria-label="Conversation options">
                <i className="bi bi-three-dots-vertical"></i>
              </button>
            )}
          </div>
        </div>

        {renderContextChips(activeConversation)}

        <div className="chat-thread__messages">
          <div className="chat-system-notice">
            <i className="bi bi-shield-check"></i>
            <div>
              <strong>{notice.title}</strong>
              <p>{notice.body}</p>
            </div>
          </div>
          {renderMessageList()}
          <div ref={messagesEndRef}></div>
        </div>

        {activeConversation.is_closed ? (
          <div className="chat-detail-closed">This conversation is closed. Reopen it before sending another reply.</div>
        ) : (
          <form className="chat-thread__composer" onSubmit={handleSendMessage}>
            <button type="button" className="chat-composer-icon" aria-label="Attach file" onClick={() => fileInputRef.current?.click()}>
              <i className="bi bi-plus-lg"></i>
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
            />
            <textarea
              className="form-control chat-composer-input"
              rows="1"
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={attachment ? `Attached: ${attachment.name}` : 'Type your message...'}
            ></textarea>
            <button type="button" className="chat-composer-icon optional" aria-label="Emoji">
              <i className="bi bi-emoji-smile"></i>
            </button>
            <button type="submit" className="chat-composer-send" disabled={sending || !messageBody.trim()}>
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        )}
      </>
    );
  }

  return (
    <div className={`chat-workspace ${detailMode ? 'chat-workspace--detail' : ''}`}>
      {showHeader ? (
        <div className="chat-workspace__header">
          <div>
            <span className="section-eyebrow">In-App Chat</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          {totalUnread ? <span className="messages-unread-pill">{totalUnread} unread</span> : null}
        </div>
      ) : null}

      {status ? <div className="alert alert-info mb-3">{status}</div> : null}

      <div className={`chat-workspace__layout ${showThread ? '' : 'list-only'}`}>
        {!detailMode ? (
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
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="chat-conversation-card__head">
                      <span className="chat-avatar">{getConversationName(conversation).charAt(0).toUpperCase()}</span>
                      <strong>{getConversationName(conversation)}</strong>
                      {conversation.unread_count ? <span className="tool-badge">{conversation.unread_count}</span> : null}
                    </div>
                    <span>{conversation.context_summary}</span>
                    <p>{conversation.last_message_preview || 'No messages yet.'}</p>
                    <small>
                      {getConversationTypeLabel(conversation)} / {formatTimestamp(conversation.last_message_at || conversation.updated_at)}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="filter-empty-state h-100">
                <h4>{emptyTitle}</h4>
                <p>{emptyDescription}</p>
                <div className="messages-empty-actions">
                  <a className="btn btn-slessaa btn-slessaa-primary" href="/shop">Browse products</a>
                  <a className="btn btn-slessaa btn-slessaa-outline" href="/orders">Start from orders</a>
                  <a className="btn btn-slessaa btn-slessaa-outline" href="/tailoring">View customization</a>
                </div>
              </div>
            )}
          </aside>
        ) : null}

        {showThread ? (
          <div className={`chat-workspace__thread ${detailMode ? 'chat-detail-shell' : 'table-card'}`}>
            {renderThread()}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ChatWorkspace;
