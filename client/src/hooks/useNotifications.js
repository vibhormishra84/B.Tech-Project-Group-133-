import { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { token } = useAuth()
  const [permission, setPermission] = useState(Notification.permission)
  const [dueMedications, setDueMedications] = useState([])

  useEffect(() => {
    if (!token) return

    // Request permission on mount
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(setPermission)
    }

    // Check for due medications every 15 seconds for more accurate timing
    const interval = setInterval(() => {
      checkDueMedications()
    }, 15000) // Check every 15 seconds

    checkDueMedications() // Initial check

    return () => clearInterval(interval)
  }, [token])

  async function checkDueMedications() {
    if (!token || permission !== 'granted') return

    try {
      const data = await apiFetch('/api/tracker/today', { token }).catch(() => [])
      const now = new Date()
      const notifiedKeys = new Set(JSON.parse(sessionStorage.getItem('notifiedMedications') || '[]'))
      
      // Check each medication's due time
      const upcoming = data.filter(m => {
        if (!m.dueTime) return false
        const dueTime = new Date(m.dueTime)
        const minutesUntil = (dueTime - now) / 1000 / 60
        // Notify if due within 15 minutes and not already notified for this specific time
        const notificationKey = `${m._id || m.id}-${dueTime.getTime()}`
        return minutesUntil <= 15 && minutesUntil >= 0 && !notifiedKeys.has(notificationKey)
      })

      if (upcoming.length > 0 && permission === 'granted') {
        upcoming.forEach(med => {
          const medId = med._id || med.id
          const medName = med.medicineName || med.medicine?.name || 'Medication'
          const dosage = med.dosage || 'As prescribed'
          const dueTime = new Date(med.dueTime)
          const timeStr = dueTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          const minutesUntil = Math.round((dueTime - now) / 1000 / 60)
          const notificationKey = `${medId}-${dueTime.getTime()}`
          
          try {
            const notification = new Notification(`💊 Time to take ${medName}`, {
              body: `Dosage: ${dosage}\nTime: ${timeStr}${minutesUntil > 0 ? ` (in ${minutesUntil} min)` : ''}`,
              icon: '/vite.svg',
              tag: notificationKey,
              requireInteraction: true, // Keep notification visible
              silent: false,
              badge: '/vite.svg'
            })
            
            // Mark as notified
            notifiedKeys.add(notificationKey)
            sessionStorage.setItem('notifiedMedications', JSON.stringify(Array.from(notifiedKeys)))
            
            // Clear old notifications (older than 1 hour)
            const oneHourAgo = now.getTime() - 60 * 60 * 1000
            const filtered = Array.from(notifiedKeys).filter(key => {
              const time = parseInt(key.split('-').pop())
              return time > oneHourAgo
            })
            sessionStorage.setItem('notifiedMedications', JSON.stringify(filtered))
            
            // Clear notification after 10 seconds
            setTimeout(() => notification.close(), 10000)
          } catch (notifError) {
            console.error('Failed to show notification:', notifError)
          }
        })
      }

      setDueMedications(data)
    } catch (e) {
      console.error('Failed to check due medications:', e)
    }
  }

  return { permission, dueMedications, requestPermission: () => Notification.requestPermission().then(setPermission) }
}

