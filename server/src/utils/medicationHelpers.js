function calculateNextDose(lastTaken, frequency, times, startDate) {
  if (!times || times.length === 0) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If medication hasn't started yet
  if (startDate && new Date(startDate) > now) {
    const start = new Date(startDate);
    const [hours, minutes] = times[0].split(':').map(Number);
    start.setHours(hours, minutes, 0, 0);
    return start;
  }
  
  // Get today's times that are after now
  const todayTimes = times
    .map(t => {
      const [hours, minutes] = t.split(':').map(Number);
      const timeDate = new Date(today);
      timeDate.setHours(hours, minutes, 0, 0);
      return timeDate;
    })
    .filter(t => t > now)
    .sort((a, b) => a - b);
  
  if (todayTimes.length > 0) {
    return todayTimes[0];
  }
  
  // If no times today, get first time tomorrow
  const [hours, minutes] = times[0].split(':').map(Number);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);
  return tomorrow;
}

module.exports = { calculateNextDose };

