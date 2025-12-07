import { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { calculateBMI, getBMICategory } from '../utils/bmi'

export default function ProfilePage() {
  const { token } = useAuth()
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    age: '',
    height: '',
    weight: '',
    bmi: null,
    medicalConditions: [],
    allergies: [],
    emergencyContact: { name: '', phone: '', relationship: '' },
    notificationPreferences: { email: true, sms: false, push: true, calendar: false },
    diabetesStatus: 'none',
    bloodPressureStatus: 'normal'
  })
  const [newCondition, setNewCondition] = useState('')
  const [newAllergy, setNewAllergy] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const data = await apiFetch('/api/users/profile', { token })
      setProfile({
        name: data.name || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        age: data.age || '',
        height: data.height || '',
        weight: data.weight || '',
        bmi: data.bmi || null,
        medicalConditions: data.medicalConditions || [],
        allergies: data.allergies || [],
        emergencyContact: data.emergencyContact || { name: '', phone: '', relationship: '' },
        notificationPreferences: data.notificationPreferences || { email: true, sms: false, push: true, calendar: false },
        diabetesStatus: data.diabetesStatus || 'none',
        bloodPressureStatus: data.bloodPressureStatus || 'normal'
      })
    } catch (e) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1]
      setProfile({
        ...profile,
        emergencyContact: { ...(profile.emergencyContact || {}), [field]: value }
      })
    } else if (name.startsWith('notificationPreferences.')) {
      const field = name.split('.')[1]
      setProfile({
        ...profile,
        notificationPreferences: { ...(profile.notificationPreferences || {}), [field]: checked }
      })
    } else {
      setProfile({ ...profile, [name]: value })
    }

    // Auto-calculate BMI when height or weight changes
    if (name === 'height' || name === 'weight') {
      const height = name === 'height' ? parseFloat(value) : profile.height
      const weight = name === 'weight' ? parseFloat(value) : profile.weight
      if (height && weight) {
        const bmi = calculateBMI(weight, height)
        setProfile(p => ({ ...p, bmi }))
      }
    }
  }

  function addCondition() {
    if (newCondition.trim()) {
      setProfile({
        ...profile,
        medicalConditions: [...profile.medicalConditions, newCondition.trim()]
      })
      setNewCondition('')
    }
  }

  function removeCondition(index) {
    setProfile({
      ...profile,
      medicalConditions: profile.medicalConditions.filter((_, i) => i !== index)
    })
  }

  function addAllergy() {
    if (newAllergy.trim()) {
      setProfile({
        ...profile,
        allergies: [...profile.allergies, newAllergy.trim()]
      })
      setNewAllergy('')
    }
  }

  function removeAllergy(index) {
    setProfile({
      ...profile,
      allergies: profile.allergies.filter((_, i) => i !== index)
    })
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch('/api/users/profile', { method: 'PUT', body: profile, token })
      setSuccess('Profile updated successfully')
    } catch (e) {
      setError(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const bmiCategory = getBMICategory(profile.bmi)

  if (loading) {
    return <div className="loading">Loading profile...</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Profile</h2>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={saveProfile} className="profile-form">
        <div className="card">
          <h3>Personal Information</h3>
          <div className="form two-col">
            <input name="name" placeholder="Full name" value={profile.name} onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" value={profile.email} onChange={handleChange} required disabled />
            <input name="phoneNumber" placeholder="Phone number" value={profile.phoneNumber} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <h3>Health Metrics</h3>
          <div className="form two-col">
            <input name="age" type="number" placeholder="Age" value={profile.age} onChange={handleChange} min="0" />
            <input name="height" type="number" placeholder="Height (cm)" value={profile.height} onChange={handleChange} min="0" step="0.1" />
            <input name="weight" type="number" placeholder="Weight (kg)" value={profile.weight} onChange={handleChange} min="0" step="0.1" />
          </div>
          {profile.bmi && (
            <div className="bmi-display">
              <div className="bmi-value">
                BMI: <strong>{profile.bmi}</strong>
                {bmiCategory && (
                  <span className="bmi-category" style={{ color: bmiCategory.color }}>
                    ({bmiCategory.label})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Health Conditions</h3>
          <div className="form two-col">
            <div>
              <label>Diabetes Status</label>
              <select name="diabetesStatus" value={profile.diabetesStatus} onChange={handleChange}>
                <option value="none">None</option>
                <option value="prediabetes">Prediabetes</option>
                <option value="type1">Type 1</option>
                <option value="type2">Type 2</option>
              </select>
            </div>
            <div>
              <label>Blood Pressure</label>
              <select name="bloodPressureStatus" value={profile.bloodPressureStatus} onChange={handleChange}>
                <option value="normal">Normal</option>
                <option value="elevated">Elevated</option>
                <option value="hypertension1">Hypertension Stage 1</option>
                <option value="hypertension2">Hypertension Stage 2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Medical Conditions</h3>
          <div className="input-group">
            <input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Add condition" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCondition())} />
            <button type="button" className="btn" onClick={addCondition}>Add</button>
          </div>
          <div className="tags">
            {profile.medicalConditions.map((c, i) => (
              <span key={i} className="tag">
                {c}
                <button type="button" className="tag-remove" onClick={() => removeCondition(i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Allergies</h3>
          <div className="input-group">
            <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)} placeholder="Add allergy" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())} />
            <button type="button" className="btn" onClick={addAllergy}>Add</button>
          </div>
          <div className="tags">
            {profile.allergies.map((a, i) => (
              <span key={i} className="tag">
                {a}
                <button type="button" className="tag-remove" onClick={() => removeAllergy(i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Emergency Contact</h3>
          <div className="form two-col">
            <input name="emergencyContact.name" placeholder="Contact name" value={profile.emergencyContact.name} onChange={handleChange} />
            <input name="emergencyContact.phone" placeholder="Contact phone" value={profile.emergencyContact.phone} onChange={handleChange} />
            <input name="emergencyContact.relationship" placeholder="Relationship" value={profile.emergencyContact.relationship} onChange={handleChange} />
          </div>
        </div>

        <div className="card">
          <h3>Notification Preferences</h3>
          <div className="form">
            <label className="checkbox-label">
              <input type="checkbox" name="notificationPreferences.email" checked={profile.notificationPreferences?.email || false} onChange={handleChange} />
              Email notifications
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="notificationPreferences.sms" checked={profile.notificationPreferences?.sms || false} onChange={handleChange} />
              SMS notifications
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="notificationPreferences.push" checked={profile.notificationPreferences?.push || false} onChange={handleChange} />
              Browser push notifications
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="notificationPreferences.calendar" checked={profile.notificationPreferences?.calendar || false} onChange={handleChange} />
              Calendar sync (export to Google Calendar)
            </label>
          </div>
          <p className="muted" style={{ marginTop: '8px', fontSize: '13px' }}>
            Enable browser notifications to get reminders 15 minutes before medication time. 
            Use "Export to Calendar" in the Tracker page to sync with Google Calendar.
          </p>
        </div>

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </form>
    </div>
  )
}

