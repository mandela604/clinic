/**
 * Visit Form Component — Shiloh Clinic
 * ──────────────────────────────────────────────────────────────────────
 * Reusable modal for creating new visits.
 * Uses VisitService for data (patients, doctors, departments, appointments).
 *
 * Usage:
 *   <script src="visit-form.js"></script>
 *   VisitForm.open({ onCreated: (visit) => { ... } });
 */

const VisitForm = {

  _overlay: null,
  _onCreated: null,

  async open(opts = {}) {
    this._onCreated = opts.onCreated || null;
    await this._render();
  },

  close() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      setTimeout(() => { this._overlay.remove(); this._overlay = null; }, 200);
    }
  },

  async _render() {
    if (this._overlay) this._overlay.remove();

    let patients = [], doctors = [], departments = [];
    try { patients = await VisitService.getPatients(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }
    try { doctors = await VisitService.getDoctors(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }
    try { departments = await VisitService.getDepartments(); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }

    const overlay = document.createElement('div');
    overlay.id = 'visitFormOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto;opacity:0;transition:opacity .2s;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;width:100%;max-width:620px;box-shadow:0 20px 60px rgba(0,0,0,0.2);font-family:'Segoe UI',Roboto,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e5e7eb;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">New Visit</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Register a patient visit</div>
          </div>
          <div onclick="VisitForm.close()" style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;font-size:16px;border:1px solid #e5e7eb;background:#fff;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">&#10005;</div>
        </div>

        <div style="padding:22px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="grid-column:1/-1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Patient *</label>
              <select id="vfPatient" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select patient...</option>
                ${patients.map(p => `<option value="${p.id}" data-hosp="${p.hospitalNo}" data-name="${p.name}">${p.name} (${p.hospitalNo})</option>`).join('')}
              </select>
            </div>

            <div id="vfApptSection" style="grid-column:1/-1;display:none;">
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">
                <i class="fa-solid fa-calendar-check" style="color:#16a34a;"></i> Link to Appointment
              </label>
              <div id="vfApptList" style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:120px;overflow-y:auto;"></div>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Department *</label>
              <select id="vfDept" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select department...</option>
                ${departments.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Doctor *</label>
              <select id="vfDoctor" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;background:#fff;">
                <option value="">Select doctor...</option>
                ${doctors.map(d => `<option value="${d.name}" data-dept="${d.department}">${d.name} — ${d.specialty}</option>`).join('')}
              </select>
            </div>

            <div style="grid-column:1/-1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:5px;">Reason for Visit *</label>
              <textarea id="vfReason" rows="3" placeholder="e.g. Persistent headache, prenatal checkup..." style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#334155;resize:vertical;font-family:inherit;"></textarea>
            </div>

            <div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
              <input type="checkbox" id="vfConsult" style="width:16px;height:16px;accent-color:#16a34a;">
              <label for="vfConsult" style="font-size:13px;color:#334155;cursor:pointer;">Request consultation after visit</label>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid #e5e7eb;background:#fafbfc;border-radius:0 0 14px 14px;">
          <div onclick="VisitForm.close()" style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#334155;">Cancel</div>
          <div id="vfSubmitBtn" onclick="VisitForm._submit()" style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;border:1px solid #2563eb;">Create Visit</div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    this._overlay = overlay;
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });

    document.getElementById('vfPatient').addEventListener('change', (e) => this._onPatientChange(e.target.value));
    document.getElementById('vfDept').addEventListener('change', () => this._filterDoctors());
  },

  async _onPatientChange(patientId) {
    const apptSection = document.getElementById('vfApptSection');
    const apptList = document.getElementById('vfApptList');
    if (!patientId) { apptSection.style.display = 'none'; return; }

    let appts = [];
    try { appts = await VisitService.getUpcomingAppointments(patientId); } catch (e) { if (window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error'); }
    if (appts.length) {
      apptSection.style.display = '';
      apptList.innerHTML = appts.map(a => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12.5px;color:#334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
          <input type="radio" name="vfAppt" value="${a.id}" data-dept="${a.department}" data-doctor="${a.doctor}" style="accent-color:#2563eb;">
          <div>
            <div style="font-weight:600;">${a.date} at ${a.time}</div>
            <div style="font-size:11px;color:#64748b;">${a.doctor} — ${a.department} (${a.type})</div>
          </div>
        </label>
      `).join('');

      apptList.querySelectorAll('input[type=radio]').forEach(r => {
        r.addEventListener('change', (e) => {
          const dept = e.target.dataset.dept;
          const doctor = e.target.dataset.doctor;
          if (dept) document.getElementById('vfDept').value = dept;
          if (doctor) document.getElementById('vfDoctor').value = doctor;
        });
      });
    } else {
      apptSection.style.display = 'none';
    }
  },

  _filterDoctors() {
    const dept = document.getElementById('vfDept').value;
    const sel = document.getElementById('vfDoctor');
    const current = sel.value;
    sel.querySelectorAll('option[data-dept]').forEach(opt => {
      opt.style.display = (!dept || opt.dataset.dept === dept) ? '' : 'none';
    });
    if (current && sel.querySelector(`option[value="${current}"]`)?.style.display === 'none') {
      sel.value = '';
    }
  },

  async _submit() {
    const patientSel = document.getElementById('vfPatient');
    const patientOpt = patientSel.selectedOptions[0];
    const dept = document.getElementById('vfDept').value;
    const doctor = document.getElementById('vfDoctor').value;
    const reason = document.getElementById('vfReason').value.trim();
    const consult = document.getElementById('vfConsult').checked;
    const apptRadio = document.querySelector('input[name="vfAppt"]:checked');

    if (!patientSel.value) return this._shake('vfPatient');
    if (!dept) return this._shake('vfDept');
    if (!doctor) return this._shake('vfDoctor');
    if (!reason) return this._shake('vfReason');

    const btn = document.getElementById('vfSubmitBtn');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:phspin .6s linear infinite;vertical-align:middle;margin-right:6px;"></span>Creating...';

    setTimeout(async () => {
      let visit = null;
      try {
        visit = await VisitService.createVisit({
        patientId: patientSel.value,
        patientName: patientOpt.dataset.name,
        hospitalNo: patientOpt.dataset.hosp,
        department: dept,
        doctor,
        reason,
        appointmentId: apptRadio ? apptRadio.value : null,
        consultationRequested: consult
      });

      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.innerHTML = 'Create Visit';
      this.close();
      if (!visit && window.ShilohAPI) window.ShilohAPI.toast('Could not load data. Check connection / login.', 'error');
      if (this._onCreated) this._onCreated(visit);
    }, 500);
  },

  _shake(fieldId) {
    const el = document.getElementById(fieldId);
    el.style.borderColor = '#ef4444';
    el.style.animation = 'vfShake 0.4s ease';
    setTimeout(() => { el.style.borderColor = '#e5e7eb'; el.style.animation = ''; }, 600);
  }
};

window.VisitForm = VisitForm;

const vfStyle = document.createElement('style');
vfStyle.textContent = '@keyframes vfShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}@keyframes phspin{to{transform:rotate(360deg)}}';
document.head.appendChild(vfStyle);
