const express = require('express');
const { body, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/labOrdersController');
const router = express.Router();

router.use(protect);

router.get('/stats', ctrl.stats);
router.get('/', query('search').optional().trim().escape(), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/',
  authorize('Administrator','admin','Doctor','Lab Technician'),
  body('patientId').trim().notEmpty().withMessage('patientId (uuid) required').escape(),
  body('test').trim().notEmpty().isLength({max:80}).escape(),
  body('orderedBy').trim().notEmpty().isLength({max:60}).escape(),
  body('priority').optional().isIn(['routine','urgent','stat']).escape(),
  body('category').optional().trim().isLength({max:40}).escape(),
  handleValidation, ctrl.create);

router.put('/:id',
  authorize('Administrator','admin','Lab Technician'),
  body('status').optional().isIn(['Pending','Completed','In Progress','Sample Collected','pending','collected','progress','completed','critical','cancelled']).escape(),
  body('priority').optional().isIn(['routine','urgent','stat']).escape(),
  handleValidation, ctrl.update);

router.post('/:id/complete',
  authorize('Administrator','admin','Lab Technician'),
  body('result').trim().notEmpty().isLength({max:500}).escape(),
  body('resultClass').optional().isIn(['normal','critical']).escape(),
  body('resultNotes').optional().trim().isLength({max:1000}).escape(),
  handleValidation, ctrl.complete);

router.patch('/:id/advance',
  authorize('Administrator','admin','Lab Technician'),
  ctrl.advance);

router.delete('/:id', authorize('Administrator','admin'), ctrl.remove);

module.exports = router;
