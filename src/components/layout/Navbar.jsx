import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { storefrontHighlights } from '../../data/storefront';
import { MAIN_NAV_LINKS, ROUTE_PATHS } from '../../routes/config';
import { getDashboardPath } from '../../utils/roleRouting';
import { listChatConversations } from '../../services/api';
import SearchBar from '../common/SearchBar';

function formatNotificationTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

function Navbar({
  notifications = [],
  unreadCount = 0,
  onNotificationRead,
  onMarkAllNotificationsRead,
  canInstall = false,
  onInstallApp
}) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMenuSource, setAccountMenuSource] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { isAuthenticated, user, logout } = useAuth();
  const showCustomerTools = !isAuthenticated || user?.role === 'customer';
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  function closeMenu() {
    setOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
    setAccountMenuSource(null);
  }

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    let timer = null;

    async function loadMessageCount() {
      if (!isAuthenticated || user?.role !== 'customer') {
        if (active) setMessageUnreadCount(0);
        return;
      }
      try {
        const conversations = await listChatConversations();
        if (active) {
          setMessageUnreadCount(conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0));
        }
      } catch {
        if (active) setMessageUnreadCount(0);
      }
    }

    loadMessageCount();
    timer = window.setInterval(loadMessageCount, 30000);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        setNotificationsOpen(false);
        setAccountOpen(false);
        setAccountMenuSource(null);
      }
    }

    function handlePointerDown(event) {
      if (!navRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
        setAccountOpen(false);
        setAccountMenuSource(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  function handleNotificationClick(item) {
    if (!item?.is_read && onNotificationRead) {
      onNotificationRead(item.id);
    }
    setNotificationsOpen(false);
    if (item?.action_url) {
      navigate(item.action_url);
    }
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate('/');
  }

  function getRoleAccountLinks() {
    if (!user) return [];

    const dashboardPath = getDashboardPath(user);
    const role = user.role || 'customer';
    const profilePath =
      role === 'vendor'
        ? '/dashboard/vendor/settings'
        : role === 'tailor'
          ? '/dashboard/tailor/settings'
          : role === 'admin'
            ? '/dashboard/admin/settings'
            : role === 'super_admin'
              ? '/dashboard/super-admin/settings'
              : '/profile';
    const ordersPath =
      role === 'vendor'
        ? '/dashboard/vendor/orders'
        : role === 'tailor'
          ? '/dashboard/tailor/assigned-requests'
          : role === 'admin'
            ? '/dashboard/admin/orders'
            : role === 'super_admin'
              ? '/dashboard/super-admin/orders'
              : '/orders';

    const links = [
      { to: profilePath, title: 'Profile', body: 'Manage your account details.' },
      { to: ordersPath, title: role === 'tailor' ? 'Assigned Requests' : 'Orders', body: 'Open your order or work queue.' },
      { to: dashboardPath, title: 'Dashboard', body: 'Open your role workspace.' },
    ];

    if (role === 'customer') {
      links.splice(2, 0, { to: '/wishlist', title: 'Wishlist', body: 'Open your saved products.' });
      links.splice(2, 0, { to: '/messages', title: 'Messages', body: 'Continue vendor and tailor chats.' });
    }

    return links;
  }

  function toggleAccountMenu(source) {
    setNotificationsOpen(false);
    const nextOpen = !(accountOpen && accountMenuSource === source);
    setAccountOpen(nextOpen);
    setAccountMenuSource(nextOpen ? source : null);
  }

  function renderAccountTools(source = 'desktop') {
    if (isAuthenticated) {
      const accountLinks = getRoleAccountLinks();
      const panelOpen = accountOpen && accountMenuSource === source;

      return (
        <div className={`notification-dropdown account-dropdown account-dropdown--${source}`}>
          <button
            type="button"
            className="tool-icon border-0"
            aria-label="Account menu"
            aria-expanded={panelOpen}
            aria-haspopup="menu"
            onClick={() => toggleAccountMenu(source)}
          >
            <i className="bi bi-person-circle"></i>
          </button>
          {panelOpen ? (
            <div className="notification-panel account-panel" role="menu">
              <div className="notification-panel-head">
                <div>
                  <strong>{user?.full_name || user?.email}</strong>
                  <small>{user?.role}</small>
                </div>
              </div>
              <div className="notification-panel-list">
                {accountLinks.map((item) => (
                  <Link key={`${source}-${item.to}-${item.title}`} to={item.to} className="notification-item" role="menuitem" onClick={closeMenu}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </Link>
                ))}
                <button type="button" className="notification-item" role="menuitem" onClick={handleLogout}>
                  <strong>Logout</strong>
                  <p>Sign out and clear your active session.</p>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link to="/login" className="tool-icon" aria-label="Account" onClick={closeMenu}>
        <i className="bi bi-person"></i>
      </Link>
    );
  }

  return (
    <header className="site-header">
      <div className="utility-strip">
        <div className="container utility-strip-inner">
          <div className="utility-copy">
            {storefrontHighlights.map((item) => (
              <span key={item.label}>
                <strong>{item.label}</strong> {item.value}
              </span>
            ))}
          </div>
          <div className="utility-links">
            <Link to={ROUTE_PATHS.trackOrder}>Track Order</Link>
            <Link to={ROUTE_PATHS.contact}>Contact</Link>
          </div>
        </div>
      </div>

      <nav className="slessaa-navbar">
        <div className="container navbar-shell" ref={navRef}>
          <button
            type="button"
            className={`navbar-mobile-backdrop ${open ? 'open' : ''}`}
            aria-label="Close navigation"
            aria-hidden={!open}
            onClick={closeMenu}
          ></button>
          <div className="navbar-desktop">
            <div className="navbar-left">
              <Link className="slessaa-brand-lockup" to="/" onClick={closeMenu}>
                <img src="/logo.svg" alt="Slessaa Clothing Logo" className="brand-logo" />
              </Link>
            </div>

            <div className="navbar-center">
              <ul className="navbar-nav-center">
                {MAIN_NAV_LINKS.map((link) => (
                  <li key={link.path} className="nav-item">
                    <NavLink className="nav-link nav-link-nowrap" to={link.path} onClick={closeMenu}>
                      <span className="nav-link-label">{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="navbar-right">
              <div className="navbar-search">
                <SearchBar
                  placeholder="Search shirts, dresses, kurtas..."
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onSearchComplete={closeMenu}
                />
              </div>
              <div className="navbar-tools">
                <div className="notification-dropdown">
                  <button type="button" className="tool-icon border-0" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}>
                    <i className="bi bi-bell"></i>
                    <span className="tool-badge">{unreadCount}</span>
                  </button>
                  {notificationsOpen ? (
                    <div className="notification-panel">
                      <div className="notification-panel-head">
                        <strong>Notifications</strong>
                        {unreadCount ? (
                          <button type="button" className="btn btn-link p-0" onClick={onMarkAllNotificationsRead}>
                            Mark all read
                          </button>
                        ) : null}
                      </div>
                      <div className="notification-panel-list">
                        {notifications.length ? notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`notification-item ${item.is_read ? '' : 'unread'}`}
                            onClick={() => handleNotificationClick(item)}
                          >
                            <strong>{item.title}</strong>
                            <p>{item.body}</p>
                            <small>{formatNotificationTime(item.created_at)}</small>
                          </button>
                        )) : (
                          <div className="notification-empty">No notifications yet.</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                {renderAccountTools()}
                {showCustomerTools ? (
                  <>
                    <Link to={ROUTE_PATHS.wishlist} className="tool-icon" aria-label="Wishlist" onClick={closeMenu}>
                      <i className="bi bi-heart"></i>
                      <span className="tool-badge">{wishlistCount}</span>
                    </Link>
                    {isAuthenticated ? (
                      <Link to={ROUTE_PATHS.messages} className="tool-icon" aria-label="Messages" onClick={closeMenu}>
                        <i className="bi bi-chat-dots"></i>
                        <span className="tool-badge">{messageUnreadCount}</span>
                      </Link>
                    ) : null}
                    <Link to={ROUTE_PATHS.cart} className="tool-icon" aria-label="Cart" onClick={closeMenu}>
                      <i className="bi bi-bag"></i>
                      <span className="tool-badge">{cartCount}</span>
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="navbar-mobile-bar">
            <Link className="slessaa-brand-lockup" to="/" onClick={closeMenu}>
              <img src="/logo.svg" alt="Slessaa Clothing Logo" className="brand-logo" />
            </Link>

            <div className="navbar-mobile-actions">
              {showCustomerTools ? (
                <Link to={ROUTE_PATHS.cart} className="tool-icon mobile-cart-icon" aria-label="Cart" onClick={closeMenu}>
                  <i className="bi bi-bag"></i>
                  <span className="tool-badge">{cartCount}</span>
                </Link>
              ) : null}
              <button
                className={`navbar-toggle ${open ? 'active' : ''}`}
                type="button"
                aria-expanded={open}
                aria-label="Toggle navigation"
                onClick={() => setOpen((value) => !value)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>

          <div className={`navbar-panel ${open ? 'open' : ''}`}>
            <div className="navbar-panel-search">
              <SearchBar
                placeholder="Search shirts, dresses, kurtas..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onSearchComplete={closeMenu}
              />
            </div>
            <ul className="navbar-mobile-links">
              {MAIN_NAV_LINKS.map((link) => (
                <li key={link.path} className="nav-item">
                  <NavLink className="nav-link nav-link-nowrap" to={link.path} onClick={() => setOpen(false)}>
                    <span className="nav-link-label">{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="navbar-mobile-tools">
              <button
                type="button"
                className="btn btn-slessaa btn-slessaa-outline navbar-mobile-tool-btn"
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <i className="bi bi-bell me-2"></i>
                Notifications {unreadCount ? `(${unreadCount})` : ''}
              </button>
              {renderAccountTools('mobilePanel')}
              {showCustomerTools ? (
                <>
                  <Link to={ROUTE_PATHS.wishlist} className="btn btn-slessaa btn-slessaa-outline navbar-mobile-tool-btn" onClick={closeMenu}>
                    <i className="bi bi-heart me-2"></i>
                    Wishlist {wishlistCount ? `(${wishlistCount})` : ''}
                  </Link>
                  {isAuthenticated ? (
                    <Link to={ROUTE_PATHS.messages} className="btn btn-slessaa btn-slessaa-outline navbar-mobile-tool-btn" onClick={closeMenu}>
                      <i className="bi bi-chat-dots me-2"></i>
                      Messages {messageUnreadCount ? `(${messageUnreadCount})` : ''}
                    </Link>
                  ) : null}
                  <Link to={ROUTE_PATHS.cart} className="btn btn-slessaa btn-slessaa-outline navbar-mobile-tool-btn" onClick={closeMenu}>
                    <i className="bi bi-bag me-2"></i>
                    Cart {cartCount ? `(${cartCount})` : ''}
                  </Link>
                </>
              ) : null}
              {canInstall ? (
                <button type="button" className="btn btn-slessaa btn-slessaa-outline navbar-install-btn" onClick={onInstallApp}>
                  <i className="bi bi-download me-2"></i>
                  Install App
                </button>
              ) : null}
            </div>
          </div>

          {notificationsOpen ? (
            <div className="notification-panel mobile">
              <div className="notification-panel-head">
                <strong>Notifications</strong>
                {unreadCount ? (
                  <button type="button" className="btn btn-link p-0" onClick={onMarkAllNotificationsRead}>
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="notification-panel-list">
                {notifications.length ? notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item ${item.is_read ? '' : 'unread'}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <small>{formatNotificationTime(item.created_at)}</small>
                  </button>
                )) : (
                  <div className="notification-empty">No notifications yet.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
