import { createContext, useContext, useEffect, useState } from 'react'
import { get, post } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true)
    get('/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true))
  }, [])

  const login = async (email, password) => {
    const { token, user } = await post('/auth/login', { email, password })
    localStorage.setItem('token', token)
    setUser(user)
  }
  const logout = () => { localStorage.removeItem('token'); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin: user?.role === 'admin', ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
