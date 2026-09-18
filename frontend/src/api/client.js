/**
 * Cliente HTTP para a API REST do Church
 */
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? `${envUrl.slice(0, -1)}/api` : `${envUrl}/api`;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('igrejaelcana.com.br')) {
    return 'https://api.igrejaelcana.com.br/api';
  }
  return '/api';
};

export const BASE_URL = getApiBaseUrl();

if (typeof window !== 'undefined') {
  window.__CHURCH_API_URL__ = BASE_URL;
}

export const getAuthToken = () => {
  return localStorage.getItem('church_token');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('church_token', token);
  } else {
    localStorage.removeItem('church_token');
  }
};

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Ocorreu um erro na requisição.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Autenticação
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Conteúdo da Home (Público e Editor)
  getPublicContent: () => request('/content/public'),
  getAllContent: () => request('/content'),
  createContent: (item) => request('/content', { method: 'POST', body: item }),
  updateContent: (id, item) => request(`/content/${id}`, { method: 'PUT', body: item }),
  deleteContent: (id) => request(`/content/${id}`, { method: 'DELETE' }),

  // GrapesJS Multi-Page Manager
  getPages: () => request('/page'),
  createPage: (data) => request('/page/create', { method: 'POST', body: data }),
  deletePage: (slug) => request(`/page/${slug}`, { method: 'DELETE' }),
  getPage: (slug = 'home') => request(`/page/${slug}`),
  savePage: (slug = 'home', data) => request(`/page/${slug}`, { method: 'POST', body: data }),

  // GrapesJS Asset Manager (Uploads)
  getAssets: () => request('/uploads'),
  deleteAsset: (filename) => request(`/uploads/${filename}`, { method: 'DELETE' }),

  // GrapesJS Plugins Manager
  getPlugins: () => request('/plugins'),
  createPlugin: (data) => request('/plugins', { method: 'POST', body: data }),
  togglePlugin: (id) => request(`/plugins/${id}/toggle`, { method: 'PUT' }),
  deletePlugin: (id) => request(`/plugins/${id}`, { method: 'DELETE' }),

  // Usuários (Admin)
  getUsers: () => request('/users'),
  createUser: (userData) => request('/users', { method: 'POST', body: userData }),
  updateUser: (id, userData) => request(`/users/${id}`, { method: 'PUT', body: userData }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Logs (Admin)
  getLogs: () => request('/logs'),
  clearLogs: () => request('/logs', { method: 'DELETE' }),

  // Assistente de IA (Godolfredo)
  sendAiMessage: (message, history = []) => request('/ai/chat', { method: 'POST', body: { message, history } }),

  // Bíblia Sagrada Interativa (NVI, ACF, AA)
  getBibleVersions: () => request('/bible/versions'),
  getBibleBooks: () => request('/bible/books'),
  getBibleChapter: (version = 'nvi', bookAbbr = 'gn', chapter = 1) => request(`/bible/${version}/${bookAbbr}/${chapter}`),
  searchBible: (query, version = 'nvi') => request(`/bible/search?q=${encodeURIComponent(query)}&version=${version}`),
};
