const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { savePrescriptionFromReader } = require('../controllers/prescriptionController');

router.post('/import', authRequired, savePrescriptionFromReader);

module.exports = router;


