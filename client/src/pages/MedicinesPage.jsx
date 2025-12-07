import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MedicinesPage() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', description: '', price: 0, symptoms: '' })
  const [showAddForm, setShowAddForm] = useState(false)

  async function load() {
    try {
      const data = await apiFetch(`/api/medicines${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      setItems(data)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function createMedicine(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const body = { ...form, price: Number(form.price), symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean) }
      await apiFetch('/api/medicines', { method: 'POST', body, token })
      setForm({ name: '', description: '', price: 0, symptoms: '' })
      setShowAddForm(false)
      setSuccess('Medicine added successfully! You can now add it to your tracker.')
      load()
    } catch (e) { setError(e.message || 'Failed to create medicine') }
  }

  async function remove(id) {
    try { await apiFetch(`/api/medicines/${id}`, { method: 'DELETE', token }); load() } catch (e) { setError(e.message) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Medicine Catalog</h2>
          <p className="muted" style={{ marginTop: '4px', fontSize: '14px' }}>
            Browse and manage available medicines. Add medicines here first, then add them to your tracker.
          </p>
        </div>
        {token && (
          <button className="btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Medicine'}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {token && showAddForm && (
        <div className="card">
          <h3>Add New Medicine</h3>
          <form onSubmit={createMedicine} className="form">
            <div className="two-col">
              <input placeholder="Medicine name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Price (₹)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
            </div>
            <textarea placeholder="Description" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input placeholder="Symptoms (comma separated, e.g., fever, headache)" value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} />
            <div className="actions">
              <button className="btn" type="submit">Add Medicine</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="page-header" style={{ marginBottom: '16px' }}>
          <h3>Available Medicines</h3>
          <div className="input-group" style={{ maxWidth: '400px' }}>
            <input placeholder="Search medicines..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
            <button className="btn" onClick={load}>Search</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            <p>No medicines found. {token && 'Add your first medicine to get started!'}</p>
          </div>
        ) : (
          <div className="medicines-grid">
            {items.map(m => (
              <div key={m._id} className="medicine-card">
                <div className="medicine-header">
                  <h4>{m.name}</h4>
                  <div className="price-badge">₹{m.price}</div>
                </div>
                {m.description && <p className="medicine-description">{m.description}</p>}
                {m.symptoms && m.symptoms.length > 0 && (
                  <div className="medicine-symptoms">
                    <span className="symptoms-label">For:</span>
                    <div className="badges">
                      {m.symptoms.map((s, i) => <span key={i} className="badge">{s}</span>)}
                    </div>
                  </div>
                )}
                <div className="medicine-actions">
                  <Link to="/tracker" className="btn" style={{ flex: 1, textAlign: 'center' }}>
                    Add to Tracker
                  </Link>
                  {token && (
                    <button className="btn danger" onClick={() => remove(m._id)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


