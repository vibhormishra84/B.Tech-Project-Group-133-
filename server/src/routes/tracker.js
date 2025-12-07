const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const {
  getSchedule,
  getToday,
  addMedication,
  updateMedication,
  deleteMedication,
  markTaken,
  dismissReminder,
  getStats
} = require('../controllers/trackerController');

router.get('/schedule', authRequired, getSchedule);
router.get('/today', authRequired, getToday);
router.get('/stats', authRequired, getStats);
router.post('/medication', authRequired, addMedication);
router.put('/medication/:id', authRequired, updateMedication);
router.delete('/medication/:id', authRequired, deleteMedication);
router.post('/taken/:id', authRequired, markTaken);
router.post('/dismiss/:id', authRequired, dismissReminder);

module.exports = router;

