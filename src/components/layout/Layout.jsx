import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import CartFeedback from '../common/CartFeedback';
import ChatbotWidget from '../common/ChatbotWidget';
import { markAllNotificationsRead, markNotificationRead, listNotifications } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Footer from './Footer';
import Navbar from './Navbar';

function NotificationToasts({ items = [], onDismiss }) {
  return (
    <div className="notification-toast-stack">
      {items.map((item) => (
        <button key={item.id} type="button" className="notification-toast" onClick={() => onDismiss(item.id)}>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </button>
      ))}
    </div>
  );
}

function AppBootLoader() {
  return (
    <div className="app-boot-loader" role="status" aria-live="polite">
      <div className="app-boot-card">
        <img src="/logo.svg" alt="Slessaa Clothing" className="app-boot-logo" />
        <strong>Preparing your Slessaa experience</strong>
        <p>Loading account and cart details for a smoother mobile experience.</p>
        <div className="app-boot-progress">
          <span></span>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { loading: cartLoading } = useCart();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastItems, setToastItems] = useState([]);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let timer = null;

    async function loadNotifications() {
      if (!isAuthenticated) {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
          setToastItems([]);
          seenIdsRef.current = new Set();
        }
        return;
      }
      try {
        const payload = await listNotifications({ limit: 12 });
        if (!active) return;
        const items = payload.notifications || [];
        setNotifications(items);
        setUnreadCount(Number(payload.unread_count || 0));
        const nextToasts = items.filter((item) => !item.is_read && !seenIdsRef.current.has(item.id)).slice(0, 3);
        if (nextToasts.length) {
          nextToasts.forEach((item) => seenIdsRef.current.add(item.id));
          setToastItems((current) => [...nextToasts, ...current].slice(0, 4));
        }
      } catch {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }

    loadNotifications();
    timer = window.setInterval(loadNotifications, 30000);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [isAuthenticated, user?.id]);

  async function handleNotificationRead(id) {
    try {
      const updated = await markNotificationRead(id);
      setNotifications((current) => current.map((item) => (item.id === id ? updated : item)));
      setUnreadCount((current) => Math.max(0, current - 1));
      setToastItems((current) => current.filter((item) => item.id !== id));
    } catch {}
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      setToastItems([]);
    } catch {}
  }

  async function handleInstallApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } finally {
      setDeferredInstallPrompt(null);
    }
  }

  const showBootLoader = authLoading || cartLoading;

  return (
    <>
      <Navbar
        notifications={notifications}
        unreadCount={unreadCount}
        onNotificationRead={handleNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        canInstall={Boolean(deferredInstallPrompt)}
        onInstallApp={handleInstallApp}
      />
      {showBootLoader ? <AppBootLoader /> : null}
      <main>
        <Outlet />
      </main>
      <NotificationToasts items={toastItems} onDismiss={handleNotificationRead} />
      <ChatbotWidget />
      <CartFeedback />
      <Footer />
    </>
  );
}

export default Layout;
