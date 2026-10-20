const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Static department list used by registration dropdowns
const DEPARTMENTS = [
  'General OPD',
  'Family Medicine',
  'Obstetrics & Gynaecology',
  'Paediatrics',
  'Cardiology',
  'Internal Medicine',
  'Surgery',
  'Orthopaedics',
  'ENT',
  'Ophthalmology',
  'Dental',
  'Laboratory',
  'Radiology',
  'Pharmacy',
  'Antenatal Clinic',
  'Family Planning'
];

router.use(protect);
router.get('/', (req, res) => res.json(DEPARTMENTS));

module.exports = router;
