const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/patientController');
const router = express.Router();

router.use(protect);

// GET /api/patients?search=&status=&page=&limit=
router.get('/',
  query('search').optional().trim().escape(),
  query('status').optional().trim().escape(),
  ctrl.list);

router.get('/stats', ctrl.stats);
router.get('/hospital/:hospitalNo', ctrl.getByHospitalNo);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse', 'Receptionist'),
  body('name').optional().trim().escape(),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('hospitalNo').optional().trim().escape(),
  body('phonePrimary').trim().notEmpty().withMessage('Phone required').escape(),
  body('phoneSecondary').optional().trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('gender').isIn(['Male','Female','Other']).withMessage('Gender invalid'),
  body('age').optional().trim().escape(),
  body('dateOfBirth').optional().trim().escape(),
  body('bloodType').optional().trim().escape(),
  body('genotype').optional().trim().escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator', 'admin', 'Doctor', 'Nurse'),
  body('name').optional().trim().escape(),
  body('phonePrimary').optional().trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['Active','Inactive']).withMessage('Status invalid'),
  handleValidation, ctrl.update);

router.delete('/:id', authorize('Administrator', 'admin'), ctrl.remove);

module.exports = router;
