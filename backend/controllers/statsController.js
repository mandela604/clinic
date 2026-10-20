const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const LabOrder = require('../models/LabOrder');
const Prescription = require('../models/Prescription');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Role = require('../models/Role');

// GET /api/stats — single dashboard aggregation
exports.dashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [
      totalPatients, activePatients,
      totalVisits, waitingVisits, activeVisits,
      totalAppointments,
      totalAdmissions, admitted,
      totalLab, pendingLab,
      totalRx,
      totalInvoices, paidInvoices,
      totalUsers, activeUsers,
      totalRoles
    ] = await Promise.all([
      Patient.countDocuments({}),
      Patient.countDocuments({ status: 'Active' }),
      Visit.countDocuments({}),
      Visit.countDocuments({ status: 'waiting' }),
      Visit.countDocuments({ status: { $in: ['active','progress','recorded'] } }),
      Appointment.countDocuments({}),
      Admission.countDocuments({}),
      Admission.countDocuments({ status: { $in: ['Admitted','admitted'] } }),
      LabOrder.countDocuments({}),
      LabOrder.countDocuments({ status: 'Pending' }),
      Prescription.countDocuments({}),
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: 'Paid' }),
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      Role.countDocuments({}),
    ]);

    const revenueAgg = await Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paid' } } }]);
    const revenue = revenueAgg[0] || { total: 0, paid: 0 };

    res.json({
      patients: { total: totalPatients, active: activePatients },
      visits: { total: totalVisits, waiting: waitingVisits, active: activeVisits },
      appointments: { total: totalAppointments },
      admissions: { total: totalAdmissions, admitted },
      lab: { total: totalLab, pending: pendingLab },
      prescriptions: { total: totalRx },
      billing: { total: totalInvoices, paid: paidInvoices, outstanding: totalInvoices - paidInvoices, totalRevenue: revenue.total, totalPaid: revenue.paid },
      queue: { waiting: waitingVisits, active: activeVisits },
      users: { total: totalUsers, active: activeUsers },
      roles: { total: totalRoles },
      today
    });
  } catch (e) { next(e); }
};
