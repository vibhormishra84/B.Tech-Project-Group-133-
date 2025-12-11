import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  useEffect(() => {
    if (token) {
      // Decode token to get user info (basic, could be improved with API call)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ userId: payload.userId, role: payload.role, name: payload.name })
      } catch (e) {
        // Invalid token
        setToken('')
        localStorage.removeItem('token')
      }
    } else {
      setUser(null)
    }
  }, [token])

  function login(tokenData, userData) {
    localStorage.setItem('token', tokenData)
    setToken(tokenData)
    setUser(userData)
    window.dispatchEvent(new StorageEvent('storage'))
  }

  function logout() {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    window.dispatchEvent(new StorageEvent('storage'))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

