const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/statsController');
const router = express.Router();

router.use(protect);

router.get('/', ctrl.dashboard);
router.get('/dashboard', ctrl.dashboard);

module.exports = router;
