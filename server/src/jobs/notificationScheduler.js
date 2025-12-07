const cron = require('node-cron');
const { checkAndNotifyAllUsers } = require('../services/notifications');

// Run every 5 minutes to check for due medications
function startNotificationScheduler() {
  cron.schedule('*/5 * * * *', () => {
    console.log('Checking for due medications...');
    checkAndNotifyAllUsers();
  });
  
  console.log('Notification scheduler started (runs every 5 minutes)');
}

module.exports = { startNotificationScheduler };

