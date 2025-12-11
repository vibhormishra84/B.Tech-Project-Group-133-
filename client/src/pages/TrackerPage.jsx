import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { format, isToday, isTomorrow } from 'date-fns'
import MedicationModal from '../components/MedicationModal'

export default function TrackerPage() {
  const { token } = useAuth()
  const [todayMedications, setTodayMedications] = useState([])
  const [allMedications, setAllMedications] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    medicine: '',
    dosage: '',
    frequency: 'daily',
    times: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDueModal, setShowDueModal] = useState(false)

  useEffect(() => {
    if (token) {
      loadData()
      // Refresh data every 30 seconds
      const interval = setInterval(loadData, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  async function loadData() {
    try {
      setError('')
      const [today, schedule, meds] = await Promise.all([
        apiFetch('/api/tracker/today', { token }).catch(e => {
          console.error('Failed to load today:', e)
          return []
        }),
        apiFetch('/api/tracker/schedule', { token }).catch(e => {
          console.error('Failed to load schedule:', e)
          return []
        }),
        apiFetch('/api/medicines', { token }).catch(() => [])
      ])
      
      console.log('Loaded data:', { today: today?.length, schedule: schedule?.length, meds: meds?.length })
      
      setTodayMedications(today || [])
      setAllMedications(schedule || [])
      setMedicines(meds || [])
      
      // Check if any medications are due now and show modal
      if (today && today.length > 0) {
        const now = new Date()
        const dueNow = today.filter(m => {
          if (!m.dueTime) return false
          const dueTime = new Date(m.dueTime)
          const minutesUntil = (dueTime - now) / 1000 / 60
          return minutesUntil <= 15 && minutesUntil >= -30
        })
        if (dueNow.length > 0) {
          const lastShown = sessionStorage.getItem('lastDueModalTime')
          const nowTime = now.getTime()
          if (!lastShown || (nowTime - parseInt(lastShown)) > 60000) {
            setShowDueModal(true)
            sessionStorage.setItem('lastDueModalTime', nowTime.toString())
          }
        }
      }
    } catch (e) {
      console.error('Load data error:', e)
      setError('Failed to load data: ' + (e.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    if (name === 'times') {
      const times = value.split(',').map(t => t.trim()).filter(Boolean)
      setForm({ ...form, times })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  function addTime() {
    setForm({ ...form, times: [...form.times, '08:00'] })
  }

  function removeTime(index) {
    setForm({ ...form, times: form.times.filter((_, i) => i !== index) })
  }

  function updateTime(index, value) {
    const newTimes = [...form.times]
    newTimes[index] = value
    setForm({ ...form, times: newTimes })
  }

  async function submitMedication(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiFetch('/api/tracker/medication', {
        method: 'POST',
        body: {
          ...form,
          medicine: form.medicine,
          times: form.times.filter(t => t)
        },
        token
      })
      setForm({
        medicine: '',
        dosage: '',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      })
      setShowAddForm(false)
      setSuccess('Medication added to tracker successfully!')
      setTimeout(() => setSuccess(''), 3000)
      // Force reload after a short delay to ensure server has processed
      setTimeout(() => {
        loadData()
      }, 500)
    } catch (e) {
      setError(e.message || 'Failed to add medication')
    }
  }

  async function markAsTaken(id) {
    if (!id) {
      setError('Invalid medication ID')
      return
    }
    try {
      setError('')
      setSuccess('')
      await apiFetch(`/api/tracker/taken/${id}`, { method: 'POST', token })
      setSuccess('Medication marked as taken!')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    } catch (e) {
      setError(e.message || 'Failed to mark as taken')
    }
  }

  async function dismissReminder(id, date, time) {
    if (!id) return
    try {
      await apiFetch(`/api/tracker/dismiss/${id}`, {
        method: 'POST',
        body: { date, time },
        token
      })
      loadData()
    } catch (e) {
      setError('Failed to dismiss reminder')
    }
  }

  async function deleteMedication(id) {
    if (!id) {
      setError('Invalid medication ID')
      return
    }
    if (!confirm('Are you sure you want to remove this medication from your tracker?')) return
    try {
      setError('')
      setSuccess('')
      await apiFetch(`/api/tracker/medication/${id}`, { method: 'DELETE', token })
      setSuccess('Medication removed from tracker')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    } catch (e) {
      setError(e.message || 'Failed to delete medication')
    }
  }

  async function exportCalendar() {
    try {
      setError('')
      if (allMedications.length === 0) {
        setError('No medications to export. Add medications to your tracker first.')
        return
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/calendar/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(err.error || 'Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medications-${new Date().toISOString().split('T')[0]}.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('Calendar file downloaded! Import it into Google Calendar, Apple Calendar, or Outlook.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (e) {
      setError(e.message || 'Failed to export calendar. Make sure you have medications in your tracker.')
    }
  }

  if (loading) {
    return <div className="loading">Loading tracker...</div>
  }

  const dueNowCount = todayMedications.filter(m => {
    if (!m.dueTime) return false
    const dueTime = new Date(m.dueTime)
    const now = new Date()
    const minutesUntil = (dueTime - now) / 1000 / 60
    return minutesUntil <= 15 && minutesUntil >= -30
  }).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Medicine Tracker</h2>
          <p className="muted" style={{ marginTop: '4px', fontSize: '14px' }}>
            Manage your medication schedule and track adherence
          </p>
        </div>
        <div className="header-actions-group">
          {dueNowCount > 0 && (
            <button className="btn" onClick={() => setShowDueModal(true)} style={{ background: 'var(--danger)' }}>
              🔔 {dueNowCount} Due Now
            </button>
          )}
          <button className="btn ghost" onClick={exportCalendar}>
            📅 Export Calendar
          </button>
          <button className="btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Medication'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showAddForm && (
        <div className="card add-medication-card">
          <h3>Add Medication to Tracker</h3>
          <p className="muted" style={{ marginBottom: '20px', fontSize: '14px' }}>
            Select a medicine from the catalog and set your schedule. Don't see your medicine?{' '}
            <Link to="/medicines" style={{ color: 'var(--accent)' }}>Add it to the catalog first</Link>.
          </p>
          <form onSubmit={submitMedication} className="medication-form">
            <div className="form-section">
              <label>Medicine *</label>
              <select name="medicine" value={form.medicine} onChange={handleFormChange} required>
                <option value="">Select from catalog...</option>
                {medicines.length === 0 ? (
                  <option disabled>No medicines in catalog. Add medicines first.</option>
                ) : (
                  medicines.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))
                )}
              </select>
              {medicines.length === 0 && (
                <p className="form-help">
                  <Link to="/medicines" style={{ color: 'var(--accent)' }}>Go to Medicines page</Link> to add medicines to the catalog first.
                </p>
              )}
            </div>

            <div className="form-row">
              <div className="form-section">
                <label>Dosage</label>
                <input name="dosage" placeholder="e.g., 500mg, 1 tablet" value={form.dosage} onChange={handleFormChange} />
              </div>
              <div className="form-section">
                <label>Frequency *</label>
                <select name="frequency" value={form.frequency} onChange={handleFormChange}>
                  <option value="daily">Daily</option>
                  <option value="twice-daily">Twice Daily</option>
                  <option value="thrice-daily">Thrice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="as-needed">As Needed</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <label>Times *</label>
              <div className="times-list">
                {form.times.map((time, i) => (
                  <div key={i} className="time-input-group">
                    <input type="time" value={time} onChange={e => updateTime(i, e.target.value)} required />
                    {form.times.length > 1 && (
                      <button type="button" className="btn-icon" onClick={() => removeTime(i)} title="Remove time">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn ghost" onClick={addTime} style={{ marginTop: '8px' }}>
                + Add Another Time
              </button>
            </div>

            <div className="form-row">
              <div className="form-section">
                <label>Start Date *</label>
                <input name="startDate" type="date" value={form.startDate} onChange={handleFormChange} required />
              </div>
              <div className="form-section">
                <label>End Date (optional)</label>
                <input name="endDate" type="date" value={form.endDate} onChange={handleFormChange} />
                <p className="form-help">Leave empty for ongoing medication</p>
              </div>
            </div>

            <div className="form-section">
              <label>Notes (optional)</label>
              <textarea name="notes" placeholder="Any additional notes..." rows="3" value={form.notes} onChange={handleFormChange} />
            </div>

            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn">Add to Tracker</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Today's Schedule</h3>
            <p className="muted" style={{ marginTop: '4px', fontSize: '13px' }}>
              Medications scheduled for today with next due time
            </p>
          </div>
          {todayMedications.length > 0 && (
            <span className="badge">{todayMedications.length} medication{todayMedications.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {todayMedications.length === 0 ? (
          <div className="empty">
            <p>No medications scheduled for today. Add medications to get started!</p>
            {allMedications.length > 0 && (
              <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                You have {allMedications.length} medication{allMedications.length !== 1 ? 's' : ''} in your tracker, but none are scheduled for today.
              </p>
            )}
          </div>
        ) : (
          <div className="medication-list">
            {todayMedications.map((med, index) => {
              const medId = med._id || med.id || `temp-${index}`
              if (!medId) {
                console.warn('Medication missing ID:', med)
                return null
              }
              
              const dueTime = med.dueTime ? new Date(med.dueTime) : null
              const now = new Date()
              const minutesUntil = dueTime ? Math.round((dueTime - now) / 1000 / 60) : null
              const isOverdue = minutesUntil !== null && minutesUntil < 0
              const isDueSoon = minutesUntil !== null && minutesUntil <= 15 && minutesUntil >= 0
              
              return (
                <div key={medId} className={`medication-item ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : 'upcoming'}`}>
                  <div className="med-info">
                    <div className="med-header">
                      <h4>{med.medicineName || med.medicine?.name || 'Unknown Medicine'}</h4>
                      <div className="med-badges">
                        {isOverdue && <span className="badge danger">Overdue</span>}
                        {isDueSoon && <span className="badge" style={{ background: 'var(--accent)' }}>Due Soon</span>}
                        {!isOverdue && !isDueSoon && <span className="badge" style={{ background: '#4caf50' }}>Upcoming</span>}
                      </div>
                    </div>
                    <div className="med-details">
                      <div className="detail-row">
                        <span className="detail-label">Dosage:</span>
                        <span>{med.dosage || 'As prescribed'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Frequency:</span>
                        <span>{med.frequency || 'daily'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Times:</span>
                        <span>{med.times?.join(', ') || 'Not set'}</span>
                      </div>
                      {dueTime && (
                        <div className="detail-row highlight">
                          <span className="detail-label">⏰ Next Due:</span>
                          <span className="due-time-display">
                            {format(dueTime, 'h:mm a')}
                            {minutesUntil !== null && (
                              <span className="time-until">
                                {isOverdue ? ` (${Math.abs(minutesUntil)} min ago)` : ` (in ${minutesUntil} min)`}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {med.lastTaken && (
                        <div className="detail-row">
                          <span className="detail-label">Last Taken:</span>
                          <span>{format(new Date(med.lastTaken), 'MMM d, h:mm a')}</span>
                        </div>
                      )}
                      {med.notes && (
                        <div className="detail-row">
                          <span className="detail-label">Notes:</span>
                          <span>{med.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="med-actions">
                    <button className="btn" onClick={() => markAsTaken(medId)}>
                      ✓ Mark Taken
                    </button>
                    {dueTime && (
                      <button 
                        className="btn ghost" 
                        onClick={() => dismissReminder(medId, dueTime.toISOString(), med.timeStr)}
                        title="Dismiss this reminder (won't affect other reminders)"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>All Tracked Medications</h3>
            <p className="muted" style={{ marginTop: '4px', fontSize: '13px' }}>
              All active medications in your tracker (future dates only)
            </p>
          </div>
          {allMedications.length > 0 && (
            <span className="badge">{allMedications.length} medication{allMedications.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {allMedications.length === 0 ? (
          <div className="empty">
            <p>No medications in your tracker yet. Add medications to start tracking!</p>
          </div>
        ) : (
          <div className="medication-list">
            {allMedications
              .sort((a, b) => {
                const nextA = a.nextDose ? new Date(a.nextDose).getTime() : Infinity
                const nextB = b.nextDose ? new Date(b.nextDose).getTime() : Infinity
                if (nextA !== Infinity || nextB !== Infinity) {
                  return nextA - nextB
                }
                return (a.medicine?.name || '').localeCompare(b.medicine?.name || '')
              })
              .map((med, index) => {
                const medId = med._id || med.id || `temp-${index}`
                if (!medId) {
                  console.warn('All medications - missing ID:', med)
                  return null
                }
                
                return (
                  <div key={medId} className="medication-item">
                    <div className="med-info">
                      <div className="med-header">
                        <h4>{med.medicine?.name || 'Unknown Medicine'}</h4>
                        {!med.medicine && (
                          <span className="badge" style={{ background: 'var(--danger)', fontSize: '11px' }}>
                            ⚠️ Removed from catalog
                          </span>
                        )}
                      </div>
                      <div className="med-details">
                        <div className="detail-row">
                          <span className="detail-label">Dosage:</span>
                          <span>{med.dosage || 'As prescribed'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Frequency:</span>
                          <span>{med.frequency || 'daily'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Times:</span>
                          <span>{med.times?.join(', ') || 'Not set'}</span>
                        </div>
                        {med.nextDose && (
                          <div className="detail-row highlight">
                            <span className="detail-label">Next Dose:</span>
                            <span>{format(new Date(med.nextDose), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                        {med.lastTaken && (
                          <div className="detail-row">
                            <span className="detail-label">Last Taken:</span>
                            <span>{format(new Date(med.lastTaken), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-label">Period:</span>
                          <span>
                            {format(new Date(med.startDate), 'MMM d, yyyy')}
                            {med.endDate ? ` - ${format(new Date(med.endDate), 'MMM d, yyyy')}` : ' (ongoing)'}
                          </span>
                        </div>
                        {med.notes && (
                          <div className="detail-row">
                            <span className="detail-label">Notes:</span>
                            <span>{med.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="med-actions">
                      <button className="btn" onClick={() => markAsTaken(medId)}>Mark Taken</button>
                      <button className="btn danger" onClick={() => deleteMedication(medId)}>Remove</button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {allMedications.length > 0 && (
        <div className="card" style={{ background: '#0f1b34', borderColor: 'var(--accent)' }}>
          <h3>📅 Calendar Export</h3>
          <p className="muted" style={{ marginBottom: '12px' }}>
            Export your medication schedule to Google Calendar, Apple Calendar, or any calendar app.
            The file includes all your medications for the next 30 days with reminders.
          </p>
          <button className="btn" onClick={exportCalendar}>
            Download Calendar File (.ics)
          </button>
          <p className="muted" style={{ marginTop: '12px', fontSize: '12px' }}>
            After downloading, open Google Calendar → Settings → Import & export → Select file → Import
          </p>
        </div>
      )}

      <MedicationModal
        isOpen={showDueModal}
        onClose={() => setShowDueModal(false)}
        medications={todayMedications}
        onMarkTaken={loadData}
        onDismiss={dismissReminder}
      />
    </div>
  )
}
