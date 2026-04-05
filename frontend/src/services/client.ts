import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

const client = axios.create({ baseURL: `${API_URL}/api` })

// 🔒 Use sessionStorage for token (more secure than localStorage)
client.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('token')
  if (token) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` }
  return cfg
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      // Only remove data if it's a confirmed auth error
      const errorMsg = error?.response?.data?.error || ''
      const isAuthError = errorMsg && !errorMsg.includes('انتهت')
      
      if (isAuthError) {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        // Force redirect to login when unauthorized to stop polling loops
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
