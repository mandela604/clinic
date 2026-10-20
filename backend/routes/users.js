const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');
const router = express.Router();

// All user routes require auth; create/update/delete require admin
router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin'),
  body('name').trim().notEmpty().withMessage('Name required').escape(),
  body('username').trim().notEmpty().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars'),
  body('role').trim().notEmpty().escape(),
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

router.post('/:id/reset-password',
  authorize('Administrator', 'admin'),
  ctrl.resetPassword);

module.exports = router;
