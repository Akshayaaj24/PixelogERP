// Small fetch wrapper — adds the login token and returns JSON
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong')
  return data
}

export const get = (p) => api(p)
export const post = (p, body) => api(p, { method: 'POST', body })
export const put = (p, body) => api(p, { method: 'PUT', body })
export const del = (p) => api(p, { method: 'DELETE' })
