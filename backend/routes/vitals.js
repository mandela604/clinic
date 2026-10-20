const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vitalsController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('bp').optional().trim().isLength({ max: 20 }).escape(),
  body('temp').optional().trim().isLength({ max: 20 }).escape(),
  body('pulse').optional().trim().isLength({ max: 20 }).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse'),
  handleValidation, ctrl.update);

router.delete('/:id', authorize('Administrator', 'admin'), ctrl.remove);

module.exports = router;
