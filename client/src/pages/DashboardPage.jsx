import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { token } = useAuth()
  const { permission, requestPermission } = useNotifications()
  const [stats, setStats] = useState({ todayCount: 0, adherence: 0, upcoming: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadStats()
      // Refresh stats every 30 seconds
      const interval = setInterval(loadStats, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  async function loadStats() {
    try {
      const [today, statsData, schedule] = await Promise.all([
        apiFetch('/api/tracker/today', { token }).catch(() => []),
        apiFetch('/api/tracker/stats', { token }).catch(() => ({ adherence: 0, todayDueCount: 0 })),
        apiFetch('/api/tracker/schedule', { token }).catch(() => [])
      ])
      
      // Filter today's medications to only show upcoming (not overdue, not taken)
      const now = new Date()
      const upcomingToday = (today || []).filter(med => {
        if (!med.dueTime) return false
        const dueTime = new Date(med.dueTime)
        return dueTime > now && med.status === 'upcoming'
      }).slice(0, 3)
      
      setStats({
        todayCount: statsData?.todayDueCount || 0,
        adherence: statsData?.adherence || 0,
        upcoming: upcomingToday,
        totalMedications: schedule?.length || 0
      })
    } catch (e) {
      console.error('Failed to load stats:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        {permission !== 'granted' && (
          <button className="btn ghost" onClick={requestPermission}>
            Enable Notifications
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Medications Due Today</h3>
              <div className="stat-value">{stats.todayCount}</div>
              {stats.totalMedications > 0 && (
                <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                  {stats.totalMedications} total in tracker
                </p>
              )}
            </div>
            <div className="stat-card">
              <h3>Adherence Rate (7 days)</h3>
              <div className="stat-value">{stats.adherence}%</div>
              <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                Based on last week
              </p>
            </div>
          </div>

          {stats.upcoming.length > 0 && (
            <div className="card">
              <h3>Upcoming Medications</h3>
              <div className="upcoming-list">
                {stats.upcoming.map((med, i) => (
                  <div key={i} className="upcoming-item">
                    <span className="med-name">{med.medicine?.name || 'Unknown'}</span>
                    <span className="med-time">{med.dueTime ? format(new Date(med.dueTime), 'h:mm a') : 'N/A'}</span>
                  </div>
                ))}
              </div>
              <Link to="/tracker" className="btn">View All</Link>
            </div>
          )}

          <div className="quick-actions">
            <Link to="/tracker" className="action-card">
              <h3>Medicine Tracker</h3>
              <p>Manage your medication schedule</p>
            </Link>
            <Link to="/chatbot" className="action-card">
              <h3>Chat with Assistant</h3>
              <p>Get medical advice and information</p>
            </Link>
            <Link to="/medicines" className="action-card">
              <h3>Browse Medicines</h3>
              <p>Explore available medications</p>
            </Link>
            <Link to="/profile" className="action-card">
              <h3>My Profile</h3>
              <p>Update health information</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
