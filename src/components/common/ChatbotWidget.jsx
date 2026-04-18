import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendChatbotMessage } from '../../services/api';
import { storefrontProducts } from '../../data/storefront';
import { getProductImage, getProductPrice } from '../../services/productUtils';

const quickPrompts = [
  'Help me choose a design',
  'Estimate my measurements',
  'Help me customize a product',
  'Recommend a vendor',
  'Track my order'
];

function formatFilters(filters = {}) {
  return [filters.category, filters.color, filters.occasion, filters.gender].filter(Boolean).join(' | ');
}

function uniqueActions(actions = []) {
  return [...new Set(actions.map((action) => String(action || '').trim()).filter(Boolean))];
}

function productMatchesPrompt(product, prompt) {
  const lowered = prompt.toLowerCase();
  const productText = [
    product.name,
    product.title,
    product.category,
    product.audience,
    product.description,
    product.badge,
    ...(product.tags || []),
    ...(product.colors || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return lowered.split(/\s+/).filter((term) => term.length > 2).some((term) => productText.includes(term));
}

function buildLocalFallbackReply(message, error) {
  const lowered = message.toLowerCase();
  const products = storefrontProducts.filter((product) => productMatchesPrompt(product, message)).slice(0, 4);

  if (lowered.includes('track') && lowered.includes('order')) {
    return {
      text: 'Open order tracking and enter your order number. If you are logged in, I can usually summarize the latest order status from your account.',
      products: [],
      filters: {},
      vendors: [],
      tailors: [],
      actions: ['Open order tracking']
    };
  }

  if (lowered.includes('custom') || lowered.includes('tailor') || lowered.includes('measure')) {
    return {
      text: 'Start on the tailoring page, describe your design, estimate measurements, then select a recommended tailor or submit without choosing one.',
      products,
      filters: {},
      vendors: [],
      tailors: [],
      actions: ['Open tailoring page', 'Generate design suggestion']
    };
  }

  if (lowered.includes('vendor') || lowered.includes('seller') || lowered.includes('shop')) {
    return {
      text: 'Open a product and use the vendor contact controls, or contact support with the product type and occasion so the request can be routed.',
      products,
      filters: {},
      vendors: [],
      tailors: [],
      actions: ['Browse best sellers', 'Contact support']
    };
  }

  if (lowered.includes('design') || lowered.includes('style') || lowered.includes('wedding') || lowered.includes('kurta')) {
    return {
      text: 'For a custom look, share garment type, occasion, color mood, fit, and neckline preference. A modern wedding kurta works well with a cotton-silk blend, regular made-to-measure fit, and a mandarin collar.',
      products,
      filters: {},
      vendors: [],
      tailors: [],
      actions: ['Open tailoring page', 'Recommend festive products']
    };
  }

  return {
    text: 'Try asking for a product type, color, occasion, customization flow, vendor, tailor, measurements, or order tracking.',
    products,
    filters: {},
    vendors: [],
    tailors: [],
    actions: ['Help me customize a product', 'Browse best sellers']
  };
}

function normalizeBotPayload(payload = {}) {
  return {
    text: payload.reply || payload.message || 'I can help with products, customization, vendors, tailors, measurements, or order tracking.',
    products: Array.isArray(payload.products) ? payload.products : [],
    filters: payload.filters || {},
    vendors: Array.isArray(payload.vendors) ? payload.vendors : [],
    tailors: Array.isArray(payload.tailors) ? payload.tailors : [],
    intent: payload.intent || 'general',
    actions: uniqueActions(payload.actions || [])
  };
}

function directoryName(item) {
  return item.brand_name || item.full_name || item.name || 'Slessaa partner';
}

function ChatbotWidget() {
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const initialMessages = useMemo(
    () => [
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Ask for product guidance, customization help, vendor suggestions, order tracking, or payment support. I can still recommend matching products from the live catalog.',
        products: [],
        filters: {},
        vendors: [],
        actions: []
      }
    ],
    []
  );
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, sending]);

  async function handleSend(nextDraft) {
    const message = String(nextDraft ?? draft).trim();
    if (!message || sending) {
      return;
    }

    setMessages((current) => [...current, { id: `user-${Date.now()}`, sender: 'user', text: message }]);
    setDraft('');
    setSending(true);

    try {
      const payload = await sendChatbotMessage(message);
      const botPayload = normalizeBotPayload(payload);
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          ...botPayload
        }
      ]);
    } catch (error) {
      const fallbackMessage =
        error?.payload?.detail || 'Live assistant data is temporarily unavailable.';
      const fallback = buildLocalFallbackReply(message, error);
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: fallback.text || fallbackMessage,
          products: fallback.products || [],
          filters: fallback.filters || {},
          vendors: fallback.vendors || [],
          tailors: fallback.tailors || [],
          actions: fallback.actions || []
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleAssistantAction(action) {
    const label = String(action || '').trim();
    if (!label) return;

    const lowered = label.toLowerCase();
    if (lowered === 'log in') {
      setOpen(false);
      navigate('/login');
      return;
    }
    if (lowered.includes('tracking') || (lowered.includes('track') && lowered.includes('order'))) {
      setOpen(false);
      navigate('/track-order');
      return;
    }
    if (lowered.includes('best seller')) {
      setOpen(false);
      navigate('/shop?curated=Best%20Seller');
      return;
    }
    if (lowered.includes('customizable product')) {
      setOpen(false);
      navigate('/shop?search=customizable');
      return;
    }
    if (lowered.includes('tailoring') || lowered.includes('measure') || lowered.includes('tailor') || lowered.includes('design suggestion') || lowered.includes('customize')) {
      setOpen(false);
      navigate('/tailoring');
      return;
    }
    if (lowered.includes('dashboard')) {
      setOpen(false);
      navigate('/dashboard/customer');
      return;
    }
    if (lowered.includes('support')) {
      setOpen(false);
      navigate('/contact');
      return;
    }
    handleSend(label);
  }

  const hasUserMessages = messages.some((message) => message.sender === 'user');
  const latestBotMessageId = [...messages].reverse().find((message) => message.sender === 'bot')?.id;

  return (
    <div className={`chatbot-widget ${open ? 'open' : ''}`}>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <span className="section-eyebrow">Slessaa Assistant</span>
              <h5>AI style and shopping help</h5>
              <p>Use it for design direction, vendor choice, customization help, order tracking, or product discovery.</p>
            </div>
          </div>
          {!hasUserMessages ? (
            <div className="chatbot-suggestions" aria-label="Starter chatbot actions">
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" className="chat-suggestion-chip" onClick={() => handleAssistantAction(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <div className="chatbot-body" ref={bodyRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.sender === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}>
                <div className={`chat-bubble ${message.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>{message.text}</div>
                {message.sender === 'bot' && formatFilters(message.filters) ? <div className="chatbot-meta">{formatFilters(message.filters)}</div> : null}
                {message.sender === 'bot' && message.products?.length ? (
                  <div className="chat-product-grid">
                    {message.products.slice(0, 4).map((product) => (
                      <Link key={product.slug || product.id} to={`/shop/${product.slug || product.id}`} className="chat-product-card" onClick={() => setOpen(false)}>
                        <img src={getProductImage(product)} alt={product.title || product.name} />
                        <div>
                          <strong>{product.title || product.name}</strong>
                          <span>{product.category_name || product.category_detail?.name || 'Slessaa Edit'}</span>
                          <small>NPR {getProductPrice(product).toLocaleString()}</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.sender === 'bot' && (message.vendors?.length || message.tailors?.length) ? (
                  <div className="chat-vendor-grid">
                    {[...(message.vendors || []), ...(message.tailors || [])].map((vendor) => (
                      <Link
                        key={vendor.id}
                        to="/contact"
                        state={{
                          vendorName: directoryName(vendor),
                          vendorUserId: vendor.user || vendor.user_id || null
                        }}
                        className="chat-vendor-card"
                        onClick={() => setOpen(false)}
                      >
                        <strong>{directoryName(vendor)}</strong>
                        <span>{vendor.specialization || 'Fashion partner'}</span>
                        <small>{vendor.location || 'Location not listed'}</small>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.sender === 'bot' && message.id === latestBotMessageId && message.actions?.length ? (
                  <div className="chatbot-actions">
                    {uniqueActions(message.actions).map((action) => (
                      <button key={`${message.id}-${action}`} type="button" className="chat-suggestion-chip subtle" onClick={() => handleAssistantAction(action)}>
                        {action}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message-bot">
                <div className="chat-bubble chat-bubble-bot typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          <div className="chatbot-input">
            <input
              className="form-control premium-input"
              placeholder="Try: I want a modern kurta or track my order"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={() => handleSend()} disabled={sending}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
      <button type="button" className="chatbot-toggle" onClick={() => setOpen((value) => !value)} aria-label="Chatbot">
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
      </button>
    </div>
  );
}

export default ChatbotWidget;
