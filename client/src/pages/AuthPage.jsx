import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'buyer' })
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'register') {
        await apiFetch('/api/auth/register', { method: 'POST', body: form })
        setMode('login')
        return
      }
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">Access your medicines and chatbot assistant</p>
        </div>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit} className="form auth-form">
          {mode === 'register' && (
            <>
              <div className="two-col">
                <input name="name" placeholder="Full name" value={form.name} onChange={onChange} required />
                <select name="role" value={form.role} onChange={onChange}>
                  <option value="buyer">Buyer</option>
                  <option value="retailer">Retailer</option>
                </select>
              </div>
            </>
          )}
          <input name="email" placeholder="Email address" value={form.email} onChange={onChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} required />
          <button className="btn primary full" type="submit">{mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        </form>
        <div className="switch-mode">
          <span className="muted">{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
          <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}


