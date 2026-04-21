import { storefrontProducts } from '../data/storefront';

function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api') ? withoutTrailingSlash : `${withoutTrailingSlash}/api`;
}

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '/api';
  }

  if (import.meta.env.DEV) {
    return '/api';
  }

  const { protocol, hostname } = window.location;
  const backendProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${backendProtocol}//${hostname}:8000/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
) || getDefaultApiBaseUrl();
const ACCESS_TOKEN_KEY = 'slessaa_access_token';
const REFRESH_TOKEN_KEY = 'slessaa_refresh_token';
const USER_KEY = 'slessaa_user';
let googleAuthConfigPromise = null;
let refreshPromise = null;

function flattenErrorMessages(value, prefix = '') {
  if (!value) return [];
  if (typeof value === 'string') return [prefix ? `${prefix}: ${value}` : value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorMessages(item, prefix));
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) => {
      const label = key === 'non_field_errors' ? '' : key.replaceAll('_', ' ');
      return flattenErrorMessages(nestedValue, label || prefix);
    });
  }
  return [prefix ? `${prefix}: ${String(value)}` : String(value)];
}

function extractErrorMessage(payload, fallback = 'Request failed.') {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (typeof payload.detail === 'string') return payload.detail;
  if (typeof payload.message === 'string') return payload.message;

  const messages = flattenErrorMessages(payload);
  return messages.length ? messages.join(' ') : fallback;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  const fallback = response.status >= 500
    ? `Server error (${response.status}). Check the backend logs for the full exception.`
    : `Request failed with status ${response.status}.`;

  if (!response.ok) {
    const error = new Error(extractErrorMessage(payload, fallback));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function buildNetworkError() {
  const error = new Error('Unable to reach Slessaa services. Check that your phone and computer are on the same Wi-Fi, then try again.');
  error.status = 0;
  error.payload = { detail: error.message };
  return error;
}

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function hasAuthSession() {
  return Boolean(getAccessToken() || getRefreshToken());
}

function normalizeAuthPayload(payload = {}) {
  const tokens = payload.tokens || payload.token || {};
  return {
    ...payload,
    access: payload.access || payload.access_token || tokens.access || tokens.access_token || '',
    refresh: payload.refresh || payload.refresh_token || tokens.refresh || tokens.refresh_token || '',
    user: payload.user || payload.profile || payload.account || null
  };
}

export function persistAuthSession(payload) {
  const normalized = normalizeAuthPayload(payload);
  if (normalized.access) window.localStorage.setItem(ACCESS_TOKEN_KEY, normalized.access);
  if (normalized.refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, normalized.refresh);
  if (normalized.user) window.localStorage.setItem(USER_KEY, JSON.stringify(normalized.user));
  window.dispatchEvent(new CustomEvent('slessaa:auth-changed', { detail: normalized.user || getStoredUser() }));
}

export function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('slessaa:auth-changed', { detail: null }));
}

function dispatchAuthRequired(path, message = 'Please log in to continue.') {
  window.dispatchEvent(new CustomEvent('slessaa:auth-required', { detail: { path, message } }));
}

async function requestWithToken(path, options = {}, tokenOverride = null) {
  const { _retryOnAuthFailure, requiresAuth, ...fetchOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };
  const token = tokenOverride || getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers
    });
  } catch {
    throw buildNetworkError();
  }
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthSession();
    return null;
  }
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    })
      .then(async (response) => {
        const payload = await parseResponse(response);
        if (payload?.access) {
          persistAuthSession({ access: payload.access, refresh, user: getStoredUser() });
          return payload.access;
        }
        clearAuthSession();
        return null;
      })
      .catch(() => {
        clearAuthSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  let token = getAccessToken();
  const requiresAuth = Boolean(options.requiresAuth);

  if (requiresAuth && !token) {
    const nextAccessToken = await refreshAccessToken();
    if (!nextAccessToken) {
      dispatchAuthRequired(path);
      const error = new Error('Please log in to continue.');
      error.status = 401;
      error.payload = { detail: error.message };
      throw error;
    }
    token = nextAccessToken;
  }

  let response = await requestWithToken(path, options, token);

  if (response.status === 401 && token && !options._retryOnAuthFailure) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      response = await requestWithToken(path, { ...options, _retryOnAuthFailure: true }, nextAccessToken);
    }
  }

  if (response.status === 401) {
    clearAuthSession();
    if (requiresAuth || token) {
      dispatchAuthRequired(path, 'Your session expired. Please log in again.');
    }
  }

  return parseResponse(response);
}

export async function loginUser(credentials) {
  const payload = await apiRequest('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password
    })
  });
  const normalized = normalizeAuthPayload(payload);
  persistAuthSession(normalized);
  return normalized;
}

export async function registerUser(payload) {
  return apiRequest('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      password: payload.password,
      confirm_password: payload.confirmPassword,
      account_type: payload.accountType
    })
  });
}

export async function getGoogleAuthConfig() {
  if (!googleAuthConfigPromise) {
    googleAuthConfigPromise = apiRequest('/auth/google/config/').catch((error) => {
      googleAuthConfigPromise = null;
      throw error;
    });
  }
  return googleAuthConfigPromise;
}

export async function loginWithGoogle(payload = {}) {
  const response = await apiRequest('/auth/google/login/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const normalized = normalizeAuthPayload(response);
  persistAuthSession(normalized);
  return normalized;
}

export async function fetchProfile() {
  return apiRequest('/account/profile/', { requiresAuth: true });
}

export async function updateProfile(payload) {
  const user = await apiRequest('/account/profile/', {
    method: 'PUT',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    requiresAuth: true
  });
  persistAuthSession({ user });
  return user;
}

export async function changePassword(payload) {
  return apiRequest('/account/password/', {
    method: 'POST',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

function unwrapListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export async function listProducts(params = {}) {
  try {
    const searchParams = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const payload = await apiRequest(`/products/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    return unwrapListResponse(payload);
  } catch {
    if (params.mine) {
      return [];
    }
    return storefrontProducts;
  }
}

export async function getSearchSuggestions(query) {
  const searchParams = new URLSearchParams();
  if (query) searchParams.set('q', query);
  return apiRequest(`/products/suggestions/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
}

export async function listCategories() {
  const payload = await apiRequest('/categories/');
  return unwrapListResponse(payload);
}

export async function getProduct(productId) {
  try {
    return await apiRequest(`/products/${productId}/`);
  } catch {
    return storefrontProducts.find(
      (product) => String(product.id) === String(productId) || product.slug === productId
    );
  }
}

export async function listVendors() {
  const payload = await apiRequest('/vendors/');
  return unwrapListResponse(payload);
}

export async function createVendorApplication(formData) {
  return apiRequest('/vendor-applications/', {
    method: 'POST',
    body: formData
  });
}

export async function listVendorApplications() {
  const payload = await apiRequest('/vendor-applications/');
  return unwrapListResponse(payload);
}

export async function updateVendorApplication(payload) {
  return apiRequest('/vendor-applications/', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function updateVendorProfile(slug, formData) {
  return apiRequest(`/vendors/${slug}/`, {
    method: 'PATCH',
    body: formData,
    requiresAuth: true
  });
}

export async function updateVendorStatus(slug, approvalStatus) {
  return apiRequest(`/vendors/${slug}/`, {
    method: 'PATCH',
    body: JSON.stringify({ approval_status: approvalStatus }),
    requiresAuth: true
  });
}

export async function listOrders() {
  const payload = await apiRequest('/orders/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function listVendorOrders() {
  const payload = await apiRequest('/vendor/orders/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function getOrder(id) {
  return apiRequest(`/orders/${id}/`, { requiresAuth: true });
}

export async function updateOrderStatus(id, payload) {
  return apiRequest(`/orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function listTrackingUpdates() {
  const payload = await apiRequest('/tracking/');
  return unwrapListResponse(payload);
}

export async function listNotifications(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  return apiRequest(`/notifications/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
}

export async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read/`, {
    method: 'POST'
  });
}

export async function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all/', {
    method: 'POST'
  });
}

export async function placeOrder(payload) {
  if (import.meta.env.DEV) {
    console.log('Submitting order payload', payload);
  }

  try {
    return await apiRequest('/orders/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Order submission failed', error.payload || error);
    }
    throw error;
  }
}

export async function initiatePayment(payload) {
  return apiRequest('/payments/initiate/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function verifyPayment(payload) {
  return apiRequest('/payments/verify/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listPayments() {
  const payload = await apiRequest('/payments/');
  return unwrapListResponse(payload);
}

export async function listReviews(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = await apiRequest(`/reviews/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  return unwrapListResponse(payload);
}

export async function listWishlistItems() {
  const payload = await apiRequest('/wishlist/');
  return unwrapListResponse(payload);
}

export async function addWishlistItem(payload) {
  return apiRequest('/wishlist/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function removeWishlistItem(id) {
  return apiRequest(`/wishlist/${id}/`, {
    method: 'DELETE'
  });
}

export async function createReview(payload) {
  return apiRequest('/reviews/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateReview(id, payload) {
  return apiRequest(`/reviews/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteReview(id) {
  return apiRequest(`/reviews/${id}/`, {
    method: 'DELETE'
  });
}

export async function listProductQuestions(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = await apiRequest(`/product-questions/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  return unwrapListResponse(payload);
}

export async function createProductQuestion(payload) {
  return apiRequest('/product-questions/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateProductQuestion(id, payload) {
  return apiRequest(`/product-questions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteProductQuestion(id) {
  return apiRequest(`/product-questions/${id}/`, {
    method: 'DELETE'
  });
}

export async function listCartItems() {
  return apiRequest('/cart/');
}

export async function addCartItem(payload) {
  return apiRequest('/cart/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateCartItem(id, payload) {
  return apiRequest(`/cart/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function removeCartItem(id) {
  return apiRequest(`/cart/${id}/`, {
    method: 'DELETE'
  });
}

export async function getDashboardSummary(role) {
  return apiRequest(`/dashboard/${role}/`, { requiresAuth: true });
}

export async function getSuperAdminAnalytics() {
  return apiRequest('/dashboard/super-admin/analytics/', { requiresAuth: true });
}

export async function listUsers() {
  const payload = await apiRequest('/auth/users/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function createAdminUser(payload) {
  return apiRequest('/auth/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function updateAdminUser(id, payload) {
  return apiRequest(`/auth/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function deleteAdminUser(id) {
  return apiRequest(`/auth/users/${id}/`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

export async function getPlatformSettings() {
  return apiRequest('/platform-settings/', { requiresAuth: true });
}

export async function updatePlatformSettings(payload) {
  return apiRequest('/platform-settings/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function listTailoringRequests() {
  const payload = await apiRequest('/tailoring-requests/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function listTailorAssignedRequests() {
  const payload = await apiRequest('/tailor/assigned-requests/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function listReturnRequests() {
  const payload = await apiRequest('/return-requests/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function createReturnRequest(formData) {
  return apiRequest('/return-requests/', {
    method: 'POST',
    body: formData,
    requiresAuth: true
  });
}

export async function updateReturnRequest(id, payload) {
  return apiRequest(`/return-requests/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function deleteReturnRequest(id) {
  return apiRequest(`/return-requests/${id}/`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

export async function listVouchers() {
  const payload = await apiRequest('/vouchers/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function createProduct(payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  return apiRequest('/products/', {
    method: 'POST',
    body: isFormData ? payload : JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function updateProduct(slug, payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  return apiRequest(`/products/${slug}/`, {
    method: 'PATCH',
    body: isFormData ? payload : JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function deleteProduct(slug) {
  return apiRequest(`/products/${slug}/`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

export async function listSupportMessages() {
  const payload = await apiRequest('/support-messages/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function createSupportMessage(payload) {
  return apiRequest('/support-messages/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateSupportMessage(id, payload) {
  return apiRequest(`/support-messages/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function listChatConversations(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = await apiRequest(`/messages/conversations/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function getChatConversation(id) {
  return apiRequest(`/messages/conversations/${id}/`, { requiresAuth: true });
}

export async function createChatConversation(payload) {
  return apiRequest('/messages/conversations/start/', {
    method: 'POST',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function listChatMessages(conversationId) {
  const payload = await apiRequest(`/messages/conversations/${conversationId}/messages/`, { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function sendChatMessage(payload) {
  const conversationId = payload instanceof FormData ? payload.get('conversation') : payload.conversation;
  return apiRequest(`/messages/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function markChatConversationRead(id) {
  return apiRequest(`/messages/conversations/${id}/read/`, {
    method: 'POST',
    requiresAuth: true
  });
}

export async function setChatConversationClosed(id, isClosed = true) {
  return apiRequest(`/messages/conversations/${id}/close/`, {
    method: 'POST',
    body: JSON.stringify({ is_closed: isClosed }),
    requiresAuth: true
  });
}

export const listMessageConversations = listChatConversations;
export const getMessageConversation = getChatConversation;
export const startMessageConversation = createChatConversation;
export const listConversationMessages = listChatMessages;
export const sendConversationMessage = sendChatMessage;
export const markMessageConversationRead = markChatConversationRead;

export async function listTailorProfiles(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = await apiRequest(`/tailor-profiles/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  return unwrapListResponse(payload);
}

export async function updateTailorProfile(id, payload) {
  return apiRequest(`/tailor-profiles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function updateTailorProfileStatus(id, approvalStatus) {
  return apiRequest(`/tailor-profiles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ approval_status: approvalStatus }),
    requiresAuth: true
  });
}

export async function getTailorRecommendation(payload) {
  return apiRequest('/tailor-recommendations/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getTailoringRequest(id) {
  return apiRequest(`/tailoring-requests/${id}/`, { requiresAuth: true });
}

export async function createTailoringRequest(formData) {
  return apiRequest('/tailoring-requests/', {
    method: 'POST',
    body: formData,
    requiresAuth: true
  });
}

export async function updateTailoringRequest(id, payload) {
  return apiRequest(`/tailoring-requests/${id}/`, {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function listTailoringMessages(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const payload = await apiRequest(`/tailoring-messages/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
    requiresAuth: true
  });
  return unwrapListResponse(payload);
}

export async function listTailorMeasurements() {
  const payload = await apiRequest('/tailor/measurements/', { requiresAuth: true });
  return unwrapListResponse(payload);
}

export async function createTailoringMessage(formData) {
  return apiRequest('/tailoring-messages/', {
    method: 'POST',
    body: formData,
    requiresAuth: true
  });
}

export async function createMeasurement(payload) {
  return apiRequest('/measurements/', {
    method: 'POST',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function updateMeasurement(id, payload) {
  return apiRequest(`/measurements/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function getMeasurementSuggestion(payload) {
  return apiRequest('/measurement-suggestions/', {
    method: 'POST',
    body: JSON.stringify(payload),
    requiresAuth: true
  });
}

export async function sendChatbotMessage(message) {
  return apiRequest('/chatbot/', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

export async function getRecommendations(payload) {
  if (!payload) {
    return apiRequest('/recommendations/');
  }
  return apiRequest('/recommendations/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getAiFashionRecommendation(payload) {
  return apiRequest('/recommend/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getWeatherInsight(payload) {
  return apiRequest('/weather/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function analyzeOutfitImage(formData) {
  return apiRequest('/upload/', {
    method: 'POST',
    body: formData
  });
}

export async function saveOutfit(payload) {
  return apiRequest('/save-outfit/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listSavedOutfits() {
  return apiRequest('/save-outfit/');
}

export async function getDesignSuggestion(payload) {
  return apiRequest('/design-suggestion/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function saveDesignSuggestion(payload) {
  return apiRequest('/save-design-suggestion/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listSavedDesignSuggestions() {
  return apiRequest('/save-design-suggestion/');
}

export async function getWardrobePlan(payload) {
  return apiRequest('/wardrobe-plan/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export { API_BASE_URL };
