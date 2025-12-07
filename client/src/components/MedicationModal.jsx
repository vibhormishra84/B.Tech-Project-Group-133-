import { useState } from 'react'
import { format } from 'date-fns'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MedicationModal({ isOpen, onClose, medications, onMarkTaken, onDismiss }) {
  const { token } = useAuth()
  const [marking, setMarking] = useState(null)
  const [dismissing, setDismissing] = useState(null)

  if (!isOpen) return null

  const dueNow = medications.filter(m => {
    if (!m.dueTime) return false
    const dueTime = new Date(m.dueTime)
    const now = new Date()
    const minutesUntil = (dueTime - now) / 1000 / 60
    return minutesUntil <= 15 && minutesUntil >= -30 // Due within 15 min or up to 30 min ago
  })

  async function handleMarkTaken(id) {
    setMarking(id)
    try {
      await apiFetch(`/api/tracker/taken/${id}`, { method: 'POST', token })
      onMarkTaken()
      // Close modal if all are marked
      const remaining = dueNow.filter(m => (m._id || m.id) !== id)
      if (remaining.length === 0) {
        setTimeout(() => onClose(), 1000)
      }
    } catch (e) {
      console.error('Failed to mark as taken:', e)
    } finally {
      setMarking(null)
    }
  }

  async function handleDismiss(id, date, time) {
    setDismissing(id)
    try {
      if (onDismiss) {
        await onDismiss(id, date, time)
      }
    } catch (e) {
      console.error('Failed to dismiss reminder:', e)
    } finally {
      setDismissing(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>💊 Medications Due Now</h3>
            <p className="muted" style={{ marginTop: '4px', fontSize: '13px' }}>
              {dueNow.length} medication{dueNow.length !== 1 ? 's' : ''} need your attention
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {dueNow.length === 0 ? (
            <div className="empty">
              <p>No medications due at this time.</p>
            </div>
          ) : (
            <div className="due-medications-list">
              {dueNow.map((med) => {
                const medId = med._id || med.id
                const dueTime = med.dueTime ? new Date(med.dueTime) : null
                const now = new Date()
                const minutesUntil = dueTime ? Math.round((dueTime - now) / 1000 / 60) : 0
                const isOverdue = minutesUntil < 0
                
                return (
                  <div key={medId} className={`due-medication-item ${isOverdue ? 'overdue' : 'due-soon'}`}>
                    <div className="due-med-info">
                      <h4>{med.medicineName || med.medicine?.name || 'Unknown Medicine'}</h4>
                      <p className="muted">{med.dosage || 'As prescribed'}</p>
                      <div className="due-time-info">
                        {dueTime && (
                          <>
                            <span className="time-display">⏰ {format(dueTime, 'h:mm a')}</span>
                            {isOverdue ? (
                              <span className="badge danger">Overdue by {Math.abs(minutesUntil)} min</span>
                            ) : (
                              <span className="badge" style={{ background: 'var(--accent)' }}>Due in {minutesUntil} min</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="due-med-actions">
                      <button 
                        className="btn" 
                        onClick={() => handleMarkTaken(medId)}
                        disabled={marking === medId}
                      >
                        {marking === medId ? 'Marking...' : '✓ Mark as Taken'}
                      </button>
                      {dueTime && (
                        <button 
                          className="btn ghost" 
                          onClick={() => handleDismiss(medId, dueTime.toISOString(), med.timeStr)}
                          disabled={dismissing === medId}
                          title="Dismiss this reminder only"
                        >
                          {dismissing === medId ? 'Dismissing...' : 'Dismiss'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}


