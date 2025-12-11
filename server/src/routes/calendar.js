const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { exportToCalendar } = require('../controllers/calendarController');

router.get('/export', authRequired, exportToCalendar);

module.exports = router;

