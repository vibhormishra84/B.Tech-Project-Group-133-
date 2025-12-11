const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const { getMe, listUsers, addPrescription, addOrder, getProfile, updateProfile } = require('../controllers/userController');

router.get('/me', authRequired, getMe);
router.get('/profile', authRequired, getProfile);
router.put('/profile', authRequired, updateProfile);
router.get('/', authRequired, requireRole(['retailer']), listUsers);
router.post('/:userId/prescriptions', authRequired, requireRole(['retailer']), addPrescription);
router.post('/me/orders', authRequired, addOrder);

module.exports = router;


