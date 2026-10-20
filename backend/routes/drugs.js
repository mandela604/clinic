const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/drugsController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin', 'Pharmacist'),
  body('name').trim().notEmpty().isLength({ max: 80 }).withMessage('name required').escape(),
  body('stock').optional().isFloat({ min: 0 }).escape(),
  body('unitPrice').optional().isFloat({ min: 0 }).escape(),
  body('reorderLevel').optional().isFloat({ min: 0 }).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin', 'Pharmacist'),
  body('name').optional().trim().isLength({ max: 80 }).escape(),
  body('stock').optional().isFloat({ min: 0 }).escape(),
  body('unitPrice').optional().isFloat({ min: 0 }).escape(),
  handleValidation, ctrl.update);

router.patch('/:id/restock',
  authorize('Administrator', 'admin', 'Pharmacist'),
  body('qty').isFloat({ gt: 0 }).withMessage('qty must be > 0'),
  handleValidation, ctrl.restock);

router.post('/:id/dispense',
  authorize('Administrator', 'admin', 'Pharmacist'),
  body('qty').isFloat({ gt: 0 }).withMessage('qty must be > 0'),
  handleValidation, ctrl.dispense);

router.delete('/:id', authorize('Administrator', 'admin'), ctrl.remove);

module.exports = router;
