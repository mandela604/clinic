require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Role = require('../models/Role');

// Load frontend demo-data to seed — single source
const demoPath = '../data/demo-data.js';
let demo = {};
try {
  // demo-data.js sets window.DemoData; emulate window
  global.window = {};
  require('../../data/demo-data.js');
  demo = global.window.DemoData || {};
} catch(e){ console.log('Could not load demo-data.js, seeding roles/users only', e.message); }

async function seed() {
  await connectDB();
  console.log('Seeding with id: uuidv4 (not _id) ...');

  // Roles
  await Role.deleteMany({});
  const roles = [
    { name:'Administrator', description:'Full access', type:'system', status:'active' },
    { name:'Doctor', description:'Patient records & prescriptions', type:'system', status:'active' },
    { name:'Nurse', description:'Vitals & nursing queue', type:'system', status:'active' },
    { name:'Lab Technician', description:'Lab orders & results', type:'system', status:'active' },
    { name:'Pharmacist', description:'Medications', type:'system', status:'active' },
    { name:'Receptionist', description:'Front desk', type:'system', status:'active' },
    { name:'Cashier', description:'Billing', type:'custom', status:'active' },
  ];
  for(const r of roles) await Role.create({ id: uuidv4(), ...r, permissions: {} });
  console.log(`Roles seeded: ${roles.length}`);

  // Admin user (id: uuidv4)
  await User.deleteMany({ username: 'admin' });
  const hash = await bcrypt.hash('admin123', 10);
  const adminRole = await Role.findOne({ name: 'Administrator' });
  await User.create({
    id: uuidv4(),
    userId: 'SHC-U-000001',
    name: 'Admin Tolu',
    username: 'admin',
    email: 'admin@shiloh.clinic',
    phone: '08031234567',
    password: hash,
    role: 'Administrator',
    roleId: adminRole ? adminRole.id : null,
    dept: 'Administration',
    status: 'active',
    img: 47
  });
  console.log('Admin user seeded: admin / admin123 (query by id)');

  // Patients from demo-data (preserve hospitalNo, map id -> uuid)
  if (demo.patients && demo.patients.length) {
    await Patient.deleteMany({});
    for(const p of demo.patients) {
      await Patient.create({
        id: uuidv4(),
        hospitalNo: p.hospitalNo,
        name: p.name,
        gender: p.gender,
        age: String(p.age),
        dateOfBirth: p.dateOfBirth,
        bloodType: p.bloodType,
        genotype: p.genotype,
        maritalStatus: p.maritalStatus,
        occupation: p.occupation,
        patientType: p.patientType,
        religion: p.religion,
        stateOfOrigin: p.stateOfOrigin,
        lga: p.lga,
        phonePrimary: p.phonePrimary,
        phoneSecondary: p.phoneSecondary,
        email: p.email,
        address: p.address,
        status: p.status,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        emergencyContact: p.emergencyContact,
        registeredOn: p.registeredOn,
        lastVisit: p.lastVisit
      });
    }
    console.log(`Patients seeded: ${demo.patients.length} (each with id: uuidv4, query by id)`);
  }

  console.log('Seed complete. All CRUD must query by id (uuid), not name. Sanitization via express-validator + xss-clean enabled.');
  process.exit(0);
}

seed().catch(e=>{ console.error(e); process.exit(1); });
