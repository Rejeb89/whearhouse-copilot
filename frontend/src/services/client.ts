import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

const client = axios.create({ baseURL: `${API_URL}/api` })

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` }
  return cfg
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Force redirect to login when unauthorized to stop polling loops
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
