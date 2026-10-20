const express = require('express');
const { query, body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const ctrl = require('../controllers/queueController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse', 'Receptionist'),
  body('patientName').optional().trim().isLength({ max: 80 }).escape(),
  body('status').optional().trim().escape(),
  body('priority').optional().trim().escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse'),
  body('status').optional().trim().escape(),
  body('diagnosis').optional().trim().isLength({ max: 500 }).escape(),
  body('notes').optional().trim().isLength({ max: 2000 }).escape(),
  handleValidation, ctrl.update);

router.patch('/:id/advance', authorize('Administrator', 'admin', 'Doctor', 'Nurse'), ctrl.advance);
router.delete('/:id', authorize('Administrator', 'admin', 'Doctor', 'Nurse'), ctrl.remove);

module.exports = router;
