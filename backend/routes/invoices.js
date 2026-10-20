const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/invoicesController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator','admin','Cashier','Receptionist'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('total').isFloat({min:0}).withMessage('total must be >=0'),
  body('paid').optional().isFloat({min:0}).escape(),
  body('status').optional().isIn(['Paid','Unpaid','Pending','Overdue','Cancelled']).escape(),
  body('method').optional().isIn(['Cash','Card','Transfer','Mobile Money','Insurance']).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator','admin','Cashier'),
  body('status').optional().isIn(['Paid','Unpaid','Pending','Overdue','Cancelled']).escape(),
  body('paid').optional().isFloat({min:0}).escape(),
  handleValidation, ctrl.update);
router.post('/:id/payments',
  authorize('Administrator','admin','Cashier','Receptionist'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
  body('method').optional().isIn(['Cash','Card','Transfer','Mobile Money','Insurance']).escape(),
  handleValidation, ctrl.addPayment);

router.delete('/:id', authorize('Administrator','admin'), ctrl.remove);

module.exports = router;
