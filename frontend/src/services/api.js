export const API_BASE = ''; // Use empty string to leverage Vite proxy for /api

let currentSandboxId = null;
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = () => {
  refreshSubscribers.map((cb) => cb());
  refreshSubscribers = [];
};

export const refreshTokenAPI = async () => {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Refresh failed");
  return await res.json();
};

export const getGithubReposAPI = async () => {
  const res = await apiFetch(`${API_BASE}/api/auth/github/repos`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch Github repos");
  return await res.json();
};

export const getNotificationsAPI = async () => {
  const res = await apiFetch(`${API_BASE}/api/auth/notifications`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return await res.json();
};

export const markNotificationsReadAPI = async () => {
  const res = await apiFetch(`${API_BASE}/api/auth/notifications/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to mark notifications as read");
  return await res.json();
};

export const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);

  if (res.status === 401 && !url.includes('/api/auth/refresh') && !url.includes('/api/auth/logout')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        await refreshTokenAPI();
        isRefreshing = false;
        onRefreshed();
        return await fetch(url, options);
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'; // Redirect to login on refresh failure
        }
        throw err;
      }
    } else {
      return new Promise((resolve) => {
        subscribeTokenRefresh(async () => {
          resolve(await fetch(url, options));
        });
      });
    }
  }

  return res;
};

const agentFetch = async (endpoint, options = {}, retries = 8, delay = 1000) => {
  if (!currentSandboxId) throw new Error("Sandbox not initialized");
  try {
    const res = await fetch(`http://${currentSandboxId}.agent.localhost${endpoint}`, {
      ...options
    });
    if (!res.ok) {
      if ((res.status === 504 || res.status === 502) && retries > 0) {
        console.log(`Sandbox not ready (HTTP ${res.status}). Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        return agentFetch(endpoint, options, retries - 1, delay * 1.5);
      }
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof TypeError && retries > 0) {
      console.log(`Sandbox network not ready. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return agentFetch(endpoint, options, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const startSandbox = async (projectId) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId })
    });
    
    if (!res.ok) {
      console.error(`Start sandbox failed with status: ${res.status}`);
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (data.sandboxId) {
      currentSandboxId = data.sandboxId;
    }
    return data;
  } catch (error) {
    console.error('Failed to start sandbox:', error);
    throw error;
  }
};

export const listProjects = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/project`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to list projects");
    return await res.json();
  } catch (error) {
    console.error('Failed to list projects:', error);
    throw error;
  }
};

export const sendHeartbeat = async (sandboxId) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sandboxId })
    });
    if (!res.ok) throw new Error("Failed to send heartbeat");
    return await res.json();
  } catch (error) {
    console.error('Failed to send heartbeat:', error);
    throw error;
  }
};

export const createProject = async (title, githubUrl = "") => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, githubUrl }),
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
};

export const shareProjectAPI = async (projectId, email, role = 'Editor') => {
  const res = await apiFetch(`${API_BASE}/api/sandbox/project/${projectId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
  return res.json();
};

export const getSharedProjectsAPI = async () => {
  const res = await apiFetch(`${API_BASE}/api/sandbox/shared-projects`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
};

export const leaveProjectAPI = async (projectId) => {
  const res = await apiFetch(`${API_BASE}/api/sandbox/project/${projectId}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
};

export const deleteProject = async (projectId) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/project/${projectId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to delete project");
    return await res.json();
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw error;
  }
};

export const updateProject = async (projectId, updates) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/sandbox/project/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update project");
    return await res.json();
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
};

export const listFiles = async () => {
  try {
    return await agentFetch('/list-files', {}, 10, 1500); // Give it up to 15-20 seconds total to boot
  } catch (error) {
    console.error('Failed to list files:', error);
    throw error;
  }
};

export const readFile = async (filename) => {
  try {
    return await agentFetch(`/read-files?files=${encodeURIComponent(filename)}`);
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
};

export const searchFilesAPI = async (query, isCaseInsensitive = false, isRegex = false) => {
  try {
    return await agentFetch(`/search?q=${encodeURIComponent(query)}&isCaseInsensitive=${isCaseInsensitive}&isRegex=${isRegex}`);
  } catch (error) {
    console.error('Failed to search files:', error);
    throw error;
  }
};

export const generateDbSchemaAPI = async (prompt, orm) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/ai/generate-db-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt, orm, modelName: 'llama' })
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate schema (${res.status})`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('generateDbSchemaAPI error:', error);
    throw error;
  }
};

export const updateFile = async (filename, content) => {
  try {
    return await agentFetch('/update-files', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ file: filename, content }]
      })
    });
  } catch (error) {
    console.error('Failed to update file:', error);
    throw error;
  }
};

export const createFiles = async (files) => {
  try {
    return await agentFetch('/create-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files // e.g. [{ file: "path/to/file", content: "..." }]
      })
    });
  } catch (error) {
    console.error('Failed to create files:', error);
    throw error;
  }
};

export const deleteItem = async (filename) => {
  try {
    return await agentFetch(`/delete-item?path=${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Failed to delete item:', error);
    throw error;
  }
};

export const invokeAI = async (message, projectId) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/ai/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, projectId })
    });
    return res; // stream response
  } catch (error) {
    console.error('Failed to invoke AI:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error("Not authenticated");
    return await res.json();
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
};

export const updateWebhook = async (webhookUrl) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/webhook`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ webhookUrl }),
    });
    if (!res.ok) throw new Error("Failed to update webhook");
    return await res.json();
  } catch (error) {
    console.error('Failed to update webhook:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
};

export const invokeAutocomplete = async (prefix, suffix) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/ai/autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prefix, suffix })
    });
    if (!res.ok) throw new Error("Failed to autocomplete");
    return await res.json();
  } catch (error) {
    console.error('Autocomplete failed:', error);
    throw error;
  }
};

export const getArchitectureGraph = async (files) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/ai/architecture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ files })
    });
    if (!res.ok) throw new Error("Failed to fetch architecture graph");
    return await res.json();
  } catch (error) {
    console.error('Failed to get architecture graph:', error);
    throw error;
  }
};

export const getSandboxId = () => currentSandboxId;

export const updateProfileAPI = async (formData) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      // DO NOT set Content-Type header here; browser will automatically set it to multipart/form-data with boundary
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update profile");
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

export const updatePreferencesAPI = async (preferences) => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(preferences),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update preferences");
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to update preferences:', error);
    throw error;
  }
};

export const deleteAccountAPI = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to delete account");
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw error;
  }
};

export const getAuditLogsAPI = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/api/auth/audit-logs`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error("Failed to fetch audit logs");
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw error;
  }
};
