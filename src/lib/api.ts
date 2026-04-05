interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sga_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sga_token');
      localStorage.removeItem('sga_admin');
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth APIs
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () =>
    apiRequest('/api/auth/logout', { method: 'POST' }),
  me: () =>
    apiRequest('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};

// Transaction APIs
export const transactionAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/api/transactions${query}`);
  },
  create: (data: any) =>
    apiRequest('/api/transactions', { method: 'POST', body: data }),
  update: (id: string, data: any) =>
    apiRequest(`/api/transactions/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    apiRequest(`/api/transactions/${id}`, { method: 'DELETE' }),
};

// Audit APIs
export const auditAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/api/audit-logs${query}`);
  },
  getByAdmin: (adminId: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/api/audit-logs/${adminId}${query}`);
  },
};

// Settings APIs
export const settingsAPI = {
  get: () => apiRequest('/api/settings'),
  update: (data: any) =>
    apiRequest('/api/settings', { method: 'PUT', body: data }),
};

// Party / Khata APIs
export const partyAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/api/parties${query}`);
  },
  create: (data: any) =>
    apiRequest('/api/parties', { method: 'POST', body: data }),
  getById: (id: string) =>
    apiRequest(`/api/parties/${id}`),
  update: (id: string, data: any) =>
    apiRequest(`/api/parties/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    apiRequest(`/api/parties/${id}`, { method: 'DELETE' }),
  getPages: (partyId: string) =>
    apiRequest(`/api/parties/${partyId}/pages`),
  createPage: (partyId: string, data: any) =>
    apiRequest(`/api/parties/${partyId}/pages`, { method: 'POST', body: data }),
  getPageTransactions: (partyId: string, pageId: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/api/parties/${partyId}/pages/${pageId}${query}`);
  },
  closePage: (partyId: string, pageId: string) =>
    apiRequest(`/api/parties/${partyId}/pages/${pageId}`, { method: 'PATCH', body: { action: 'close' } }),
  addTransaction: (partyId: string, pageId: string, data: any) =>
    apiRequest(`/api/parties/${partyId}/pages/${pageId}/transactions`, { method: 'POST', body: data }),
  updateTransaction: (partyId: string, pageId: string, txId: string, data: any) =>
    apiRequest(`/api/parties/${partyId}/pages/${pageId}/transactions/${txId}`, { method: 'PUT', body: data }),
  deleteTransaction: (partyId: string, pageId: string, txId: string) =>
    apiRequest(`/api/parties/${partyId}/pages/${pageId}/transactions/${txId}`, { method: 'DELETE' }),
};

// Health check
export const healthAPI = {
  check: () => apiRequest('/api/health'),
};

// Backup (developer only)
export const backupAPI = {
  full: () => apiRequest('/api/backup'),
  party: (partyId: string) => apiRequest(`/api/backup/party/${partyId}`),
};
