import React, { createContext, useEffect, useState } from 'react'
import client from '../api/client'

type User = { id: number; email: string; role: string; name: string; personalNumber?: string; securityUnit?: string }

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  }, [user])

  const login = async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password })
    const { token, user } = res.data.data
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
}
