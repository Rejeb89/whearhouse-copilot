import React, { createContext, useEffect, useState } from 'react'
import client from '../services/client'

type User = { id: number; email: string; role: string; name: string; personalNumber?: string; securityUnit?: string; region?: string; regionChief?: string; title?: string }

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<any>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔒 Use sessionStorage for token (cleared when browser tab closes)
  // 🔒 Only store minimal user info (ID, role, email)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem('user')
      return storedUser ? JSON.parse(storedUser) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'))

  useEffect(() => {
    if (token) sessionStorage.setItem('token', token)
    else sessionStorage.removeItem('token')
  }, [token])

  // 🔒 Refresh user data on each page load to get latest permissions
  useEffect(() => {
    if (token) {
      client.get('/auth/me').then(res => {
        setUser(res.data.data)
        // Refresh the JWT so admin-side changes (securityUnit, role) take effect
        if (res.data.token) {
          setToken(res.data.token)
          sessionStorage.setItem('token', res.data.token)
        }
      }).catch(() => {
        // Token expired or invalid, clear it
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
      })
    }
  }, [])

  // 🔒 Store minimal user data only
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user))
    } else {
      sessionStorage.removeItem('user')
    }
  }, [user])

  // Prevent data loss on browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const storedToken = sessionStorage.getItem('token')
      const storedUser = sessionStorage.getItem('user')
      
      if (storedToken && !token) {
        setToken(storedToken)
      }
      if (storedUser && !user) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [token, user])

  const login = async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password })
    const { token, user } = res.data.data
    setToken(token)
    setUser(user)
    return user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
}
