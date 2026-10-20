const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/prescriptionsController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator','admin','Doctor','Pharmacist'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('doctor').trim().notEmpty().isLength({max:60}).escape(),
  body('status').optional().isIn(['Pending','Dispensed','Completed','Cancelled']).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator','admin','Doctor','Pharmacist'),
  body('status').optional().isIn(['Pending','Dispensed','Completed','Cancelled']).escape(),
  body('notes').optional().trim().isLength({max:1000}).escape(),
  handleValidation, ctrl.update);
router.delete('/:id', authorize('Administrator','admin','Doctor'), ctrl.remove);

module.exports = router;
