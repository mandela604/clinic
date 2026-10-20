/**
 * Appointment Form Component — Shiloh Clinic
 * ──────────────────────────────────────────────────────────────────────
 * Reusable modal for creating new appointments.
 * Uses AppointmentService for data (patients, doctors, departments).
 *
 * Usage:
 *   <script src="appointment-form.js"></script>
 *   AppointmentForm.open({ patientId, patientName, hospitalNo, onCreated: (appt) => {} });
 */

const AppointmentForm = {

  _overlay: null,
  _onCreated: null,

  async open(opts = {}) {
    this._onCreated = opts.onCreated || null;
    await this._render(opts);
  },

  close() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      setTimeout(() => { this._overlay.remove(); this._overlay = null; }, 200);
    }
  },

  async _render(opts) {
    if (this._overlay) this._overlay.remove();

    let patients = [], doctors = [], departments = [];
    try { patients = await AppointmentService.getPatients(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }
    try { doctors = await AppointmentService.getDoctors(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }
    try { departments = await AppointmentService.getDepartments(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }

    const selectedPatient = opts.patientId || '';
    const selectedDoctor = opts.doctor || '';

    const overlay = document.createElement('div');
    overlay.id = 'apptFormOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto;opacity:0;transition:opacity .2s;';

    const today = new Date().toISOString().slice(0, 10);

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;width:100%;max-width:620px;box-shadow:0 20px 60px rgba(0,0,0,0.2);font-family:'Segoe UI',Roboto,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e5e7eb;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">New Appointment</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Schedule a patient appointment</div>
          </div>
          <div id="apptFormClose" style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;font-size:16px;border:1px solid #e5e7eb;background:#fff;">&#10005;</div>
        </div>

        <div style="padding:22px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="grid-column:1/-1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Patient *</label>
              <select id="afPatient" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select patient...</option>
                ${patients.map(p => `<option value="${p.id}" data-hosp="${p.hospitalNo}" data-name="${p.name}" ${p.id===selectedPatient?'selected':''}>${p.name} (${p.hospitalNo})</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Department *</label>
              <select id="afDept" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select department...</option>
                ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Doctor *</label>
              <select id="afDoctor" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select doctor...</option>
                ${doctors.map(d => `<option value="${d.name}" data-dept="${d.department}">${d.name} — ${d.specialty}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Date *</label>
              <input type="date" id="afDate" value="${today}" min="${today}" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Time *</label>
              <select id="afTime" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select time...</option>
                ${['08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM'].map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Type *</label>
              <select id="afType" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Antenatal">Antenatal</option>
                <option value="Lab Review">Lab Review</option>
                <option value="Check-up">Check-up</option>
                <option value="Family Planning">Family Planning</option>
              </select>
            </div>

            <div style="grid-column:1/-1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Reason</label>
              <textarea id="afReason" rows="2" placeholder="Brief reason for appointment..." style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;resize:vertical;font-family:inherit;"></textarea>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid #e5e7eb;background:#fafbfc;border-radius:0 0 14px 14px;">
          <div id="apptFormCancel" style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#334155;">Cancel</div>
          <div id="apptFormSubmit" style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;border:1px solid #2563eb;">Book Appointment</div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    this._overlay = overlay;
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    document.getElementById('apptFormClose').addEventListener('click', () => this.close());
    document.getElementById('apptFormCancel').addEventListener('click', () => this.close());
    document.getElementById('apptFormSubmit').addEventListener('click', () => this._submit());
    document.getElementById('afDept').addEventListener('change', () => this._filterDoctors());

    if (selectedDoctor) document.getElementById('afDoctor').value = selectedDoctor;
  },

  _filterDoctors() {
    const dept = document.getElementById('afDept').value;
    const sel = document.getElementById('afDoctor');
    const current = sel.value;
    sel.querySelectorAll('option[data-dept]').forEach(opt => {
      opt.style.display = (!dept || opt.dataset.dept === dept) ? '' : 'none';
    });
    if (current && sel.querySelector(`option[value="${current}"]`)?.style.display === 'none') sel.value = '';
  },

  async _submit() {
    const patientSel = document.getElementById('afPatient');
    const patientOpt = patientSel.selectedOptions[0];
    const dept = document.getElementById('afDept').value;
    const doctor = document.getElementById('afDoctor').value;
    const date = document.getElementById('afDate').value;
    const time = document.getElementById('afTime').value;
    const type = document.getElementById('afType').value;
    const reason = document.getElementById('afReason').value.trim();

    if (!patientSel.value) return this._shake('afPatient');
    if (!dept) return this._shake('afDept');
    if (!doctor) return this._shake('afDoctor');
    if (!date) return this._shake('afDate');
    if (!time) return this._shake('afTime');

    const btn = document.getElementById('apptFormSubmit');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:apptSpin .6s linear infinite;vertical-align:middle;margin-right:6px;"></span>Booking...';

    setTimeout(async () => {
      let appt = null;
      try {
        appt = await AppointmentService.createAppointment({
        patientId: patientSel.value,
        patientName: patientOpt.dataset.name,
        hospitalNo: patientOpt.dataset.hosp,
        department: dept,
        doctor,
        date,
        time,
        type,
        reason
      });

      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.innerHTML = 'Book Appointment';
      this.close();
      if (!appt && window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error');
      if (this._onCreated) this._onCreated(appt);
    }, 500);
  },

  _shake(fieldId) {
    const el = document.getElementById(fieldId);
    el.style.borderColor = '#ef4444';
    el.style.animation = 'afShake 0.4s ease';
    setTimeout(() => { el.style.borderColor = '#e5e7eb'; el.style.animation = ''; }, 600);
  }
};

window.AppointmentForm = AppointmentForm;

const afStyle = document.createElement('style');
afStyle.textContent = '@keyframes afShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}@keyframes apptSpin{to{transform:rotate(360deg)}}';
document.head.appendChild(afStyle);
