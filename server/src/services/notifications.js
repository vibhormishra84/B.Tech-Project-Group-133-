const User = require('../models/User');
const { calculateNextDose } = require('../utils/medicationHelpers');

async function getDueMedications(userId, minutesAhead = 15) {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    // Populate medicine, but handle deleted medicines gracefully
    try {
      await user.populate('medicinesPrescribed.medicine');
    } catch (populateError) {
      console.warn('Some medicines could not be populated:', populateError.message);
    }

    const now = new Date();
    const checkTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueMedications = [];

    for (const med of user.medicinesPrescribed) {
      if (!med.isActive) continue;
      if (!med.times || med.times.length === 0) continue;

      for (const timeStr of med.times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const dueTime = new Date(today);
        dueTime.setHours(hours, minutes, 0, 0);

        // Check if medication is due within the next X minutes
        if (dueTime > now && dueTime <= checkTime) {
          // Check if already notified or taken today
          const lastTaken = med.lastTaken ? new Date(med.lastTaken) : null;
          if (lastTaken && lastTaken >= today) {
            continue; // Already taken today
          }

          dueMedications.push({
            medication: med,
            dueTime,
            medicineName: med.medicine?.name || 'Unknown',
            dosage: med.dosage || ''
          });
        }
      }
    }

    return dueMedications;
  } catch (e) {
    console.error('Error getting due medications:', e);
    return [];
  }
}

async function checkAndNotifyAllUsers() {
  try {
    const users = await User.find({ 'notificationPreferences.push': true });
    
    for (const user of users) {
      const due = await getDueMedications(user._id, 15);
      
      if (due.length > 0) {
        // Store notification data (could be sent via WebSocket or stored for client to fetch)
        // For now, we'll just log it - the client will poll for notifications
        console.log(`User ${user._id} has ${due.length} medication(s) due soon`);
      }
    }
  } catch (e) {
    console.error('Error checking notifications:', e);
  }
}

module.exports = {
  getDueMedications,
  checkAndNotifyAllUsers
};

