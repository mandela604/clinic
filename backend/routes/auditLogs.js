const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/meta', ctrl.meta);
router.get('/count', ctrl.count);
router.get('/', ctrl.list);
router.delete('/', authorize('Administrator', 'admin'), ctrl.purge);

module.exports = router;
