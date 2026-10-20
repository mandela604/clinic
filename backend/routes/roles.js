const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/rolesController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin'),
  body('name').trim().notEmpty().withMessage('Role name required').escape(),
  body('description').optional().trim().escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin'),
  handleValidation, ctrl.update);

router.delete('/:id',
  authorize('Administrator', 'admin'),
  ctrl.remove);

router.patch('/:id/toggle-status',
  authorize('Administrator', 'admin'),
  ctrl.toggleStatus);

module.exports = router;
