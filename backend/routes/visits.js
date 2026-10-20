const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/visitsController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/',
  query('search').optional().trim().escape(),
  ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse', 'Receptionist'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('type').optional().trim().escape(),
  body('status').optional().trim().escape(),
  body('date').optional().trim().escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse'),
  body('status').optional().trim().escape(),
  body('type').optional().trim().escape(),
  handleValidation, ctrl.update);

router.delete('/:id', authorize('Administrator', 'admin', 'Doctor'), ctrl.remove);

module.exports = router;
