const User = require('../models/User');
const { createEvents } = require('ics');

async function exportToCalendar(req, res) {
  try {
    const user = await User.findById(req.user.userId).populate('medicinesPrescribed.medicine');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activeMedications = user.medicinesPrescribed.filter(m => m.isActive);
    const events = [];

    // Generate events for the next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    for (const med of activeMedications) {
      if (!med.times || med.times.length === 0) continue;

      const medName = med.medicine?.name || 'Medication';
      const dosage = med.dosage || 'As prescribed';

      // Create events for each scheduled time for the next 30 days
      for (let day = 0; day < 30; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);

        // Skip if before start date or after end date
        if (med.startDate && currentDate < new Date(med.startDate)) continue;
        if (med.endDate && currentDate > new Date(med.endDate)) continue;

        for (const timeStr of med.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const eventDate = new Date(currentDate);
          eventDate.setHours(hours, minutes, 0, 0);

          if (eventDate < startDate) continue; // Skip past events

          const year = eventDate.getFullYear();
          const month = eventDate.getMonth() + 1;
          const dayOfMonth = eventDate.getDate();

          events.push({
            title: `💊 Take ${medName}`,
            description: `Dosage: ${dosage}${med.notes ? `\nNotes: ${med.notes}` : ''}`,
            start: [year, month, dayOfMonth, hours, minutes],
            duration: { minutes: 15 },
            alarms: [
              { action: 'display', trigger: { minutes: 15 } },
              { action: 'display', trigger: { minutes: 5 } }
            ],
            status: 'CONFIRMED',
            busyStatus: 'FREE'
          });
        }
      }
    }

    if (events.length === 0) {
      return res.status(400).json({ error: 'No medications to export' });
    }

    const { error, value } = createEvents(events);

    if (error) {
      return res.status(500).json({ error: 'Failed to generate calendar file' });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="medications-${user.name || 'user'}.ics"`);
    res.send(value);
  } catch (e) {
    res.status(500).json({ error: 'Failed to export calendar' });
  }
}

module.exports = { exportToCalendar };

