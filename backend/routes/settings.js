const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');
const router = express.Router();

router.use(protect);

router.get('/', ctrl.get);
router.get('/export/:type', authorize('Administrator', 'admin'), ctrl.exportCsv);
router.post('/backup', authorize('Administrator', 'admin'), ctrl.backup);
router.put('/wards', authorize('Administrator', 'admin', 'Doctor', 'Nurse'), ctrl.updateWards);
router.put('/', authorize('Administrator', 'admin'), ctrl.update);
router.delete('/', authorize('Administrator', 'admin'), ctrl.reset);

module.exports = router;
