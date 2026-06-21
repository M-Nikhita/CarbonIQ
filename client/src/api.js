const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
}

export const api = {
  calculate: (answers) => {
    return request('/calculate', {
      method: 'POST',
      body: JSON.stringify(answers)
    });
  },

  getAdvice: (result, recommendations) => {
    return request('/advice', {
      method: 'POST',
      body: JSON.stringify({ result, recommendations })
    });
  },

  compareDecision: (distanceKm, options) => {
    return request('/decision', {
      method: 'POST',
      body: JSON.stringify({ distanceKm, options })
    });
  },

  explain: ({ type, inputs, category }) => {
    return request('/explain', {
      method: 'POST',
      body: JSON.stringify({ type, inputs, category })
    });
  },

  getSessions: (userId) => {
    return request(`/sessions/${encodeURIComponent(userId)}`, {
      method: 'GET'
    });
  },

  createSession: (userId, type, payload) => {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId, type, payload })
    });
  },

  commitSession: (sessionId) => {
    return request(`/sessions/${encodeURIComponent(sessionId)}/commit`, {
      method: 'PATCH'
    });
  },

  chat: (message, userId, baselineResult) => {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, userId, baselineResult })
    });
  }
};

