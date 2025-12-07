const User = require('../models/User');
const { calculateNextDose } = require('../utils/medicationHelpers');

// Helper to compare dates at day level
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getDayOnly(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function getSchedule(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Populate medicine, but handle deleted medicines gracefully
    try {
      await user.populate('medicinesPrescribed.medicine');
    } catch (populateError) {
      console.warn('Some medicines could not be populated:', populateError.message);
    }
    
    const now = new Date();
    const today = getDayOnly(now);
    
    // Get all active medications where current date is within the medication period
    const activeMedications = user.medicinesPrescribed.filter(m => {
      if (!m.isActive) return false;
      
      const startDate = m.startDate ? getDayOnly(m.startDate) : today;
      const endDate = m.endDate ? getDayOnly(m.endDate) : null;
      
      // Include if:
      // 1. Today is on or after start date
      // 2. Today is on or before end date (or no end date)
      const isAfterStart = today >= startDate;
      const isBeforeEnd = !endDate || today <= endDate;
      
      return isAfterStart && isBeforeEnd;
    });
    
    res.json(activeMedications);
  } catch (e) {
    console.error('Get schedule error:', e);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
}

async function getToday(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Populate medicine, but handle deleted medicines gracefully
    try {
      await user.populate('medicinesPrescribed.medicine');
    } catch (populateError) {
      console.warn('Some medicines could not be populated:', populateError.message);
    }
    
    const now = new Date();
    const today = getDayOnly(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Group by medicine and find next due time for each
    const medicineMap = new Map();
    
    for (const med of user.medicinesPrescribed) {
      if (!med.isActive) continue;
      if (!med.times || med.times.length === 0) continue;
      
      // Check if medication is active today
      const startDate = med.startDate ? getDayOnly(med.startDate) : today;
      const endDate = med.endDate ? getDayOnly(med.endDate) : null;
      
      // Skip if medication hasn't started yet or has ended
      if (today < startDate || (endDate && today > endDate)) continue;
      
      const medId = med._id ? med._id.toString() : 'unknown';
      const medName = med.medicine?.name || 'Unknown Medicine';
      
      // Find next due time for today
      let nextDueTime = null;
      let nextTimeStr = null;
      
      if (!med.times || med.times.length === 0) continue;
      
      for (const timeStr of med.times) {
        if (!timeStr) continue;
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          console.warn('Invalid time format:', timeStr);
          continue;
        }
        
        const dueTime = new Date(today);
        dueTime.setHours(hours, minutes, 0, 0);
        
        // Check if this reminder was dismissed
        const isDismissed = med.dismissedReminders?.some(d => {
          if (!d || !d.date || !d.time) return false;
          const dismissedDate = getDayOnly(d.date);
          return isSameDay(dismissedDate, today) && d.time === timeStr;
        });
        
        if (isDismissed) continue; // Skip dismissed reminders
        
        // Check if already taken today (for this specific time)
        let takenToday = false;
        if (med.lastTaken) {
          const lastTakenDate = new Date(med.lastTaken);
          const lastTakenDay = getDayOnly(lastTakenDate);
          // Consider taken if taken today and after or at the due time
          if (isSameDay(lastTakenDay, today) && lastTakenDate >= dueTime) {
            takenToday = true;
          }
        }
        
        if (takenToday) continue;
        
        // Track the earliest time for this medicine
        if (!nextDueTime || dueTime < nextDueTime) {
          nextDueTime = dueTime;
          nextTimeStr = timeStr;
        }
      }
      
      // Only add if there's a due time for today
      if (nextDueTime && !medicineMap.has(medId)) {
        medicineMap.set(medId, {
          ...med.toObject(),
          medicineName: medName,
          dueTime: nextDueTime,
          timeStr: nextTimeStr,
          status: nextDueTime <= now ? 'overdue' : 'upcoming',
          minutesUntil: Math.round((nextDueTime - now) / 1000 / 60)
        });
      }
    }
    
    // Convert map to array and sort by due time
    const todayMedications = Array.from(medicineMap.values())
      .sort((a, b) => a.dueTime - b.dueTime);
    
    res.json(todayMedications);
  } catch (e) {
    console.error('Get today error:', e);
    res.status(500).json({ error: 'Failed to fetch today schedule: ' + e.message });
  }
}

async function addMedication(req, res) {
  try {
    const { medicine, dosage, frequency, times, startDate, endDate, notes } = req.body;
    
    console.log('Adding medication:', { medicine, dosage, frequency, times, startDate, endDate });
    
    if (!medicine || !times || times.length === 0) {
      return res.status(400).json({ error: 'Medicine and times are required' });
    }
    
    const start = startDate ? new Date(startDate) : new Date();
    const nextDose = calculateNextDose(null, frequency, times, start);
    
    const medication = {
      medicine,
      dosage,
      frequency: frequency || 'daily',
      times: times.filter(t => t && t.trim()),
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      notes,
      isActive: true,
      nextDose,
      dismissedReminders: []
    };
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Add medication to array
    user.medicinesPrescribed.push(medication);
    await user.save();
    
    // Get the added medication (last one in array)
    const added = user.medicinesPrescribed[user.medicinesPrescribed.length - 1];
    
    // Populate medicine
    await user.populate('medicinesPrescribed.medicine');
    const populated = user.medicinesPrescribed[user.medicinesPrescribed.length - 1];
    
    console.log('Medication added successfully:', { id: populated._id, medicine: populated.medicine?.name });
    
    res.status(201).json(populated);
  } catch (e) {
    console.error('Add medication error:', e);
    res.status(500).json({ error: 'Failed to add medication: ' + e.message });
  }
}

async function updateMedication(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const medication = user.medicinesPrescribed.find(m => m._id.toString() === id);
    if (!medication) return res.status(404).json({ error: 'Medication not found' });
    
    Object.assign(medication, updates);
    
    // Recalculate nextDose if times or frequency changed
    if (updates.times || updates.frequency) {
      medication.nextDose = calculateNextDose(
        medication.lastTaken,
        medication.frequency,
        medication.times,
        medication.startDate
      );
    }
    
    await user.save();
    await user.populate('medicinesPrescribed.medicine');
    
    const updated = user.medicinesPrescribed.find(m => m._id.toString() === id);
    res.json(updated);
  } catch (e) {
    console.error('Update medication error:', e);
    res.status(500).json({ error: 'Failed to update medication' });
  }
}

async function deleteMedication(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Medication ID is required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Find and remove the medication
    const medicationIndex = user.medicinesPrescribed.findIndex(m => m._id.toString() === id);
    if (medicationIndex === -1) {
      return res.status(404).json({ error: 'Medication not found in tracker' });
    }
    
    user.medicinesPrescribed.splice(medicationIndex, 1);
    await user.save();
    
    res.json({ success: true, message: 'Medication removed from tracker' });
  } catch (e) {
    console.error('Delete medication error:', e);
    res.status(500).json({ error: 'Failed to delete medication: ' + e.message });
  }
}

async function markTaken(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Medication ID is required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const medication = user.medicinesPrescribed.find(m => m._id.toString() === id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found in tracker' });
    }
    
    medication.lastTaken = new Date();
    medication.nextDose = calculateNextDose(
      medication.lastTaken,
      medication.frequency,
      medication.times,
      medication.startDate
    );
    
    await user.save();
    
    // Populate medicine, but handle case where medicine might be deleted
    try {
      await user.populate('medicinesPrescribed.medicine');
    } catch (populateError) {
      console.warn('Could not populate medicine:', populateError.message);
    }
    
    const updated = user.medicinesPrescribed.find(m => m._id.toString() === id);
    res.json(updated);
  } catch (e) {
    console.error('Mark taken error:', e);
    res.status(500).json({ error: 'Failed to mark as taken: ' + e.message });
  }
}

async function dismissReminder(req, res) {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    
    if (!id || !date || !time) {
      return res.status(400).json({ error: 'Medication ID, date, and time are required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const medication = user.medicinesPrescribed.find(m => m._id.toString() === id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found in tracker' });
    }
    
    // Add dismissed reminder
    if (!medication.dismissedReminders) {
      medication.dismissedReminders = [];
    }
    
    // Check if already dismissed
    const reminderDate = getDayOnly(date);
    const alreadyDismissed = medication.dismissedReminders.some(d => {
      if (!d.date || !d.time) return false;
      const dismissedDate = getDayOnly(d.date);
      return isSameDay(dismissedDate, reminderDate) && d.time === time;
    });
    
    if (!alreadyDismissed) {
      medication.dismissedReminders.push({
        date: new Date(date),
        time: time,
        dismissedAt: new Date()
      });
      await user.save();
    }
    
    res.json({ success: true, message: 'Reminder dismissed' });
  } catch (e) {
    console.error('Dismiss reminder error:', e);
    res.status(500).json({ error: 'Failed to dismiss reminder: ' + e.message });
  }
}

async function getStats(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Populate medicine, but handle deleted medicines gracefully
    try {
      await user.populate('medicinesPrescribed.medicine');
    } catch (populateError) {
      console.warn('Some medicines could not be populated:', populateError.message);
    }
    
    const activeMedications = user.medicinesPrescribed.filter(m => m.isActive);
    const now = new Date();
    const today = getDayOnly(now);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Calculate adherence: doses taken vs doses due in last 7 days
    let totalDosesDue = 0;
    let totalDosesTaken = 0;
    
    for (const med of activeMedications) {
      if (!med.times || med.times.length === 0) continue;
      
      const dosesPerDay = med.times.length;
      const startDate = med.startDate ? getDayOnly(med.startDate) : today;
      const endDate = med.endDate ? getDayOnly(med.endDate) : null;
      
      // Count doses due in last 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - dayOffset);
        
        // Skip if before start date or after end date
        if (checkDate < startDate || (endDate && checkDate > endDate)) continue;
        
        totalDosesDue += dosesPerDay;
        
        // Check if medication was taken on this day
        if (med.lastTaken) {
          const lastTakenDate = new Date(med.lastTaken);
          const lastTakenDay = getDayOnly(lastTakenDate);
          if (isSameDay(lastTakenDay, checkDate)) {
            totalDosesTaken += dosesPerDay;
          }
        }
      }
    }
    
    const adherence = totalDosesDue > 0 ? Math.round((totalDosesTaken / totalDosesDue) * 100) : 0;
    
    // Count distinct medications due today (not dismissed, not taken)
    const todayDue = new Set();
    for (const med of activeMedications) {
      if (!med.times || med.times.length === 0) continue;
      
      const startDate = med.startDate ? getDayOnly(med.startDate) : today;
      const endDate = med.endDate ? getDayOnly(med.endDate) : null;
      if (today < startDate || (endDate && today > endDate)) continue;
      
      for (const timeStr of med.times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) continue;
        
        const dueTime = new Date(today);
        dueTime.setHours(hours, minutes, 0, 0);
        
        // Check if dismissed
        const isDismissed = med.dismissedReminders?.some(d => {
          if (!d.date || !d.time) return false;
          const dismissedDate = getDayOnly(d.date);
          return isSameDay(dismissedDate, today) && d.time === timeStr;
        });
        
        if (isDismissed) continue;
        
        // Check if taken
        let takenToday = false;
        if (med.lastTaken) {
          const lastTakenDate = new Date(med.lastTaken);
          const lastTakenDay = getDayOnly(lastTakenDate);
          if (isSameDay(lastTakenDay, today) && lastTakenDate >= dueTime) {
            takenToday = true;
          }
        }
        
        if (!takenToday) {
          const medId = med._id ? med._id.toString() : 'unknown';
          todayDue.add(medId);
        }
      }
    }
    
    res.json({ 
      adherence, 
      totalMedications: activeMedications.length,
      todayDueCount: todayDue.size
    });
  } catch (e) {
    console.error('Get stats error:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

module.exports = {
  getSchedule,
  getToday,
  addMedication,
  updateMedication,
  deleteMedication,
  markTaken,
  dismissReminder,
  getStats
};
