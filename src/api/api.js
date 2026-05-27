const BASE = '/api'

async function request(path, options = {}) {
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    }

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.status === 204 ? null : res.json()
}

// Auth
export const auth = {
    login: async (email, password) => {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        })
        if (data.token) {
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))
        }
        return data
    },
    logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    },
    me: () => request('/auth/me'),
    getUser: () => JSON.parse(localStorage.getItem('user')),
    getToken: () => localStorage.getItem('token'),
}

// Researchers
export const researchers = {
    list: () => request('/researchers'),
    get: (id) => request(`/researchers/${id}`),
    create: (data) => request('/researchers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/researchers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/researchers/${id}`, { method: 'DELETE' }),
}

// Trials
export const trials = {
    list: () => request('/trials'),
    get: (id) => request(`/trials/${id}`),
    create: (data) => request('/trials', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/trials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/trials/${id}`, { method: 'DELETE' }),
}

// Phases
export const phases = {
    list: (trialId) => request(`/trials/${trialId}/phases`),
    get: (id) => request(`/phases/${id}`),
    create: (trialId, data) => request(`/trials/${trialId}/phases`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/phases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/phases/${id}`, { method: 'DELETE' }),
}

// Participants
export const participants = {
    list: (search = '') => request(`/participants${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id) => request(`/participants/${id}`),
    create: (data) => request('/participants', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/participants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/participants/${id}`, { method: 'DELETE' }),
}

// Enrolments
export const enrolments = {
    list: (filters = {}) => {
        const q = new URLSearchParams(filters).toString()
        return request(`/enrolments${q ? `?${q}` : ''}`)
    },
    get: (id) => request(`/enrolments/${id}`),
    create: (data) => request('/enrolments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/enrolments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/enrolments/${id}`, { method: 'DELETE' }),
}

// Check-ins
export const checkins = {
    list: (enrolmentId) => request(`/enrolments/${enrolmentId}/checkins`),
    get: (id) => request(`/checkins/${id}`),
    create: (enrolmentId, data) => request(`/enrolments/${enrolmentId}/checkins`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/checkins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/checkins/${id}`, { method: 'DELETE' }),
}
