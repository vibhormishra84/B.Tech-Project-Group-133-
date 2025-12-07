const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const { createMedicine, listMedicines, getMedicine, updateMedicine, deleteMedicine } = require('../controllers/medicineController');

router.get('/', listMedicines);
router.get('/:id', getMedicine);

router.post('/', authRequired, createMedicine);
router.put('/:id', authRequired, updateMedicine);
router.delete('/:id', authRequired, deleteMedicine);

module.exports = router;


