const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),

  // Connections (CRUD)
  getConnections: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/connections${qs ? `?${qs}` : ''}`);
  },
  getConnectionById: (id) => request(`/connections/${id}`),
  createConnection: (data) => request('/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id, data) => request(`/connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConnection: (id) => request(`/connections/${id}`, { method: 'DELETE' }),

  // Simulator
  getSimulatorSession: () => request('/simulator/session'),
  simulatorConnect: (data) => request('/simulator/connect', { method: 'POST', body: JSON.stringify(data) }),
  simulatorSendData: (data) => request('/simulator/send-data', { method: 'POST', body: JSON.stringify(data) }),
  simulatorCorruptPacket: (data) => request('/simulator/corrupt-packet', { method: 'POST', body: JSON.stringify(data || {}) }),
  simulatorWait: (data) => request('/simulator/wait', { method: 'POST', body: JSON.stringify(data) }),
  simulatorDisconnect: () => request('/simulator/disconnect', { method: 'POST' }),
  simulatorReset: () => request('/simulator/reset', { method: 'POST' }),

  // Sliding Window Flow Control
  getSlidingWindow: () => request('/simulator/sliding-window'),
  slidingWindowSend: (bytes) => request('/simulator/sliding-window/send', { method: 'POST', body: JSON.stringify({ bytes }) }),
  slidingWindowAck: () => request('/simulator/sliding-window/ack', { method: 'POST' }),
  slidingWindowFillBuffer: () => request('/simulator/sliding-window/fill-buffer', { method: 'POST' }),
  slidingWindowFreeBuffer: (bytes) => request('/simulator/sliding-window/free-buffer', { method: 'POST', body: JSON.stringify({ bytes }) }),
  slidingWindowProbe: () => request('/simulator/sliding-window/probe', { method: 'POST' }),
  slidingWindowReset: () => request('/simulator/sliding-window/reset', { method: 'POST' }),

  // FSM
  getFSMState: () => request('/fsm/state'),
  triggerFSMTransition: (data) => request('/fsm/transition', { method: 'POST', body: JSON.stringify(data) }),
  resetFSM: () => request('/fsm/reset', { method: 'POST' }),
  getFSMSpec: () => request('/fsm/spec'),

  // Alerts
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: 'PUT' }),
  clearAlerts: () => request('/alerts', { method: 'DELETE' }),

  // Events
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },

  // FLAT
  validateRegex: (data) => request('/flat/validate-regex', { method: 'POST', body: JSON.stringify(data) }),
  getRegexDetails: () => request('/flat/regex-details'),
  getCFG: () => request('/flat/cfg'),
  getDerivation: (scenario) => request(`/flat/derivation?scenario=${scenario || 'full_session_2_data'}`),
  parseCFG: (data) => request('/flat/parse-cfg', { method: 'POST', body: JSON.stringify(data) }),
  getPDA: () => request('/flat/pda'),
  simulatePDA: (tokens) => request('/flat/simulate-pda', { method: 'POST', body: JSON.stringify({ tokens }) }),
  getTuringMachine: () => request('/flat/turing-machine'),
  simulateTuringMachine: (tokens) => request('/flat/simulate-tm', { method: 'POST', body: JSON.stringify({ tokens }) })
};
