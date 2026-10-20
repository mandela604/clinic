require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Role = require('../models/Role');
const User = require('../models/User');

async function seedPhase1() {
  await connectDB();
  console.log('Seeding Phase 1 (empty DB -> system roles + admin) with id: uuidv4');

  await Role.deleteMany({});
  const roles = [
    { name: 'Administrator', description: 'Full system access', type: 'system' },
    { name: 'Doctor', description: 'Patient records & prescriptions', type: 'system' },
    { name: 'Nurse', description: 'Vitals & nursing queue', type: 'system' },
    { name: 'Lab Technician', description: 'Lab orders & results', type: 'system' },
    { name: 'Pharmacist', description: 'Medications', type: 'system' },
    { name: 'Receptionist', description: 'Front desk', type: 'system' },
    { name: 'Cashier', description: 'Billing', type: 'custom' },
  ];
  for (const r of roles) {
    await Role.create({ id: uuidv4(), ...r, status: 'active', permissions: {}, usersCount: 0 });
  }
  console.log(`Roles seeded: ${roles.length} (query by id)`);

  await User.deleteMany({});
  const hash = await bcrypt.hash('Admin@123', 10);
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
    department: 'Administration',
    status: 'active',
    img: 47
  });
  console.log('Admin seeded: username=admin password=Admin@123 (login via POST /api/auth/login)');

  await mongoose.connection.close();
  console.log('Phase 1 seed complete — all CRUD uses id (uuidv4), sanitized via xss-clean + express-validator');
}

seedPhase1().catch(e => { console.error(e); process.exit(1); });
