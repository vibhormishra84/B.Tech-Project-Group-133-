import { format, addDays, isToday, isTomorrow, parse } from 'date-fns'

export function formatTime(date) {
  if (!date) return ''
  return format(new Date(date), 'h:mm a')
}

export function formatDate(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy')
}

export function isDueToday(dueDate) {
  if (!dueDate) return false
  return isToday(new Date(dueDate))
}

export function isDueTomorrow(dueDate) {
  if (!dueDate) return false
  return isTomorrow(new Date(dueDate))
}

export function calculateNextDose(lastTaken, frequency, times) {
  if (!lastTaken || !frequency || !times || times.length === 0) return null
  
  const lastDate = new Date(lastTaken)
  const now = new Date()
  
  // Get today's times that are after now
  const todayTimes = times
    .map(t => {
      const [hours, minutes] = t.split(':').map(Number)
      const timeDate = new Date(lastDate)
      timeDate.setHours(hours, minutes, 0, 0)
      return timeDate
    })
    .filter(t => t > now)
    .sort((a, b) => a - b)
  
  if (todayTimes.length > 0) {
    return todayTimes[0]
  }
  
  // If no times today, get first time tomorrow
  const [hours, minutes] = times[0].split(':').map(Number)
  const nextDate = addDays(lastDate, 1)
  nextDate.setHours(hours, minutes, 0, 0)
  return nextDate
}

