const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');
const router = express.Router();

router.get('/setup-status', ctrl.setupStatus);

router.post('/register',
  body('name').trim().notEmpty().escape(),
  body('username').trim().notEmpty().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  handleValidation, ctrl.register);

router.post('/login',
  body('password').notEmpty(),
  handleValidation, ctrl.login);

router.get('/me', protect, ctrl.me);

module.exports = router;
