const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/admissionsController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator','admin','Doctor','Nurse','Receptionist'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('ward').trim().notEmpty().withMessage('ward required').isLength({max:60}).escape(),
  body('bed').optional().trim().isLength({max:20}).escape(),
  body('admitDate').optional().isISO8601().withMessage('admitDate must be YYYY-MM-DD'),
  body('status').optional().isIn(['Admitted','Discharged','Transferred','admitted','discharged','transferred']).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator','admin','Doctor','Nurse'),
  body('ward').optional().trim().isLength({max:60}).escape(),
  body('bed').optional().trim().isLength({max:20}).escape(),
  body('status').optional().isIn(['Admitted','Discharged','Transferred','admitted','discharged','transferred']).escape(),
  body('admitDate').optional().isISO8601().escape(),
  handleValidation, ctrl.update);

router.patch('/:id/discharge',
  authorize('Administrator','admin','Doctor','Nurse'),
  body('dischargeDate').optional().isISO8601().withMessage('dischargeDate must be YYYY-MM-DD'),
  handleValidation, ctrl.discharge);

router.delete('/:id', authorize('Administrator','admin'), ctrl.remove);

module.exports = router;
