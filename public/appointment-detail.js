/**
 * Appointment Detail Component — Shiloh Clinic
 * ──────────────────────────────────────────────────────────────────────
 * Reusable modal for viewing appointment details.
 *
 * Usage:
 *   <script src="appointment-detail.js"></script>
 *   AppointmentDetail.open('APT-001');
 */

const AppointmentDetail = {

  _overlay: null,

  open(apptId) {
    const appt = AppointmentService.getById(apptId);
    if (!appt) return;
    this._render(appt);
  },

  close() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      setTimeout(() => { this._overlay.remove(); this._overlay = null; }, 200);
    }
  },

  _render(a) {
    if (this._overlay) this._overlay.remove();

    const TYPE_MAP = {
      'Consultation': { bg: '#eaf1ff', color: '#2f6fed' },
      'Follow-up': { bg: '#e9f9f0', color: '#12b76a' },
      'Antenatal': { bg: '#fdeefa', color: '#c22a94' },
      'Lab Review': { bg: '#fff4e5', color: '#c56c05' },
      'Check-up': { bg: '#eaf1ff', color: '#2f6fed' },
      'Family Planning': { bg: '#f4efff', color: '#6b3fd6' }
    };
    const STATUS_MAP = {
      'Scheduled': { bg: '#eaf1ff', color: '#1d54c9' },
      'Confirmed': { bg: '#eaf1ff', color: '#1d54c9' },
      'Completed': { bg: '#e9f9f0', color: '#0a8a52' },
      'Cancelled': { bg: '#feecec', color: '#c1362b' },
      'Pending': { bg: '#fff4e5', color: '#c56c05' }
    };
    const t = TYPE_MAP[a.type] || { bg: '#eaf1ff', color: '#2f6fed' };
    const s = STATUS_MAP[a.status] || { bg: '#fff4e5', color: '#c56c05' };

    const overlay = document.createElement('div');
    overlay.id = 'apptDetailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .2s;';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:'Segoe UI',Roboto,sans-serif;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e5e7eb;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">Appointment Details</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${a.id}</div>
          </div>
          <div id="apptDetailClose" style="width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;font-size:14px;border:1px solid #e5e7eb;">&#10005;</div>
        </div>

        <div style="padding:22px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
            <div style="width:44px;height:44px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:800;">${a.patientName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:#0f172a;">${a.patientName}</div>
              <div style="font-size:12px;color:#94a3b8;">${a.patientId || ''}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Date</div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;">${a.date}</div>
            </div>
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Time</div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;">${a.time}</div>
            </div>
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Doctor</div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;">${a.doctor}</div>
            </div>
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Department</div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;">${a.department || '—'}</div>
            </div>
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Type</div>
              <div style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:${t.bg};color:${t.color};display:inline-block;">${a.type}</div>
            </div>
            <div style="padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Status</div>
              <div style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:${s.bg};color:${s.color};display:inline-block;">${a.status}</div>
            </div>
          </div>

          ${a.reason ? `<div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Reason</div>
            <div style="font-size:13px;color:#334155;">${a.reason}</div>
          </div>` : ''}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid #e5e7eb;background:#fafbfc;border-radius:0 0 14px 14px;">
          <div id="apptDetailCloseBtn" style="padding:8px 16px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#334155;">Close</div>
          <div id="apptDetailProfile" style="padding:8px 16px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;border:1px solid #2563eb;">View Patient</div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    this._overlay = overlay;
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    document.getElementById('apptDetailClose').addEventListener('click', () => this.close());
    document.getElementById('apptDetailCloseBtn').addEventListener('click', () => this.close());
    document.getElementById('apptDetailProfile').addEventListener('click', () => {
      this.close();
      if (a.hospitalNo) window.location.href = 'patient-profile.html?hosp=' + encodeURIComponent(a.hospitalNo);
    });
  }
};

window.AppointmentDetail = AppointmentDetail;
