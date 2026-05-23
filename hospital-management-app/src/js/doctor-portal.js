// =============================================
// Doctor Portal — Real-time Dashboard
// =============================================
import { supabase } from './supabase.js';
import { getUserProfile } from './auth.js';
import { showToast, statusBadge, formatDate, openModal } from './ui.js';

let myAppointments = [];
let myPatients = [];
let myRecords = [];

export async function initDoctorPortal() {
    const profile = getUserProfile();
    document.getElementById('doc-email-display').textContent = profile?.email || '';

    await Promise.all([loadDocAppointments(), loadDocPatients(), loadDocRecords()]);
    updateDocStats();
    initDocRealtime();
    initDocNavigation();
}

async function loadDocAppointments() {
    const profile = getUserProfile();
    const docName = profile?.full_name || profile?.email?.split('@')[0] || '';
    // Get doctor_id by matching profile email or name
    const { data: doctors } = await supabase.from('doctors').select('doctor_id').or(`email.eq.${profile?.email},name.ilike.%${docName}%`);
    const docIds = doctors?.map(d => d.doctor_id) || [];

    if (docIds.length > 0) {
        const { data } = await supabase.from('appointments').select('*').in('doctor_id', docIds).order('date', { ascending: false });
        myAppointments = data || [];
    } else {
        myAppointments = [];
    }
    renderDocAppointments();
    renderDocToday();
}

async function loadDocPatients() {
    const patientIds = [...new Set(myAppointments.map(a => a.patient_id))];
    if (patientIds.length > 0) {
        const { data } = await supabase.from('patients').select('*').in('patient_id', patientIds);
        myPatients = data || [];
    } else {
        myPatients = [];
    }
    renderDocPatients();
}

async function loadDocRecords() {
    const profile = getUserProfile();
    const docName = profile?.full_name || profile?.email?.split('@')[0] || '';
    const { data } = await supabase.from('medical_records').select('*').ilike('doctor_name', `%${docName}%`).order('date', { ascending: false });
    myRecords = data || [];
    renderDocRecords();
}

function updateDocStats() {
    document.getElementById('doc-total-appointments').textContent = myAppointments.length;
    document.getElementById('doc-total-patients').textContent = myPatients.length;
    const today = new Date().toISOString().split('T')[0];
    const todayApps = myAppointments.filter(a => a.date === today);
    document.getElementById('doc-pending').textContent = todayApps.filter(a => a.status === 'scheduled').length;
    document.getElementById('doc-completed').textContent = myAppointments.filter(a => a.status === 'completed').length;
}

function renderDocToday() {
    const tbody = document.getElementById('doc-today-tbody');
    const today = new Date().toISOString().split('T')[0];
    const todayApps = myAppointments.filter(a => a.date === today);
    if (todayApps.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No appointments today</td></tr>'; return; }
    tbody.innerHTML = todayApps.map(a => {
        const patient = myPatients.find(p => p.patient_id === a.patient_id);
        return `<tr class="table-row-animate"><td>${patient?.name || a.patient_id}</td><td>${a.time}</td><td>${statusBadge(a.status)}</td><td>${a.notes || '—'}</td></tr>`;
    }).join('');
}

function renderDocAppointments() {
    const tbody = document.getElementById('doc-appointments-tbody');
    if (myAppointments.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No appointments found</td></tr>'; return; }
    tbody.innerHTML = myAppointments.map(a => `<tr class="table-row-animate"><td>${a.patient_id}</td><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${statusBadge(a.status)}</td><td>${a.notes || '—'}</td></tr>`).join('');
}

function renderDocPatients() {
    const tbody = document.getElementById('doc-patients-tbody');
    if (myPatients.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No patients found</td></tr>'; return; }
    tbody.innerHTML = myPatients.map(p => `<tr class="table-row-animate"><td><span class="id-badge">${p.patient_id}</span></td><td class="name-cell">${p.name}</td><td>${p.age}</td><td>${p.disease}</td><td>${statusBadge(p.admission_status)}</td></tr>`).join('');
}

function renderDocRecords() {
    const tbody = document.getElementById('doc-records-tbody');
    if (myRecords.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No records found</td></tr>'; return; }
    tbody.innerHTML = myRecords.map(r => `<tr class="table-row-animate"><td>${r.patient_id}</td><td>${formatDate(r.date)}</td><td><span class="record-type-badge">${r.record_type || 'visit'}</span></td><td>${r.diagnosis}</td><td>${r.prescription || '—'}</td></tr>`).join('');
}

function initDocRealtime() {
    supabase.channel('doc-appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        await loadDocAppointments();
        await loadDocPatients();
        updateDocStats();
    }).subscribe();

    supabase.channel('doc-records').on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records' }, async () => {
        await loadDocRecords();
    }).subscribe();
}

function initDocNavigation() {
    const portal = document.getElementById('doctor-portal');
    const titles = { 'doc-dashboard': ['Dashboard', 'Doctor Overview'], 'doc-appointments': ['My Appointments', 'Scheduled consultations'], 'doc-patients': ['My Patients', 'Patient records'], 'doc-records': ['Medical Records', 'Diagnoses & prescriptions'] };

    portal.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            portal.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            portal.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(`section-${section}`)?.classList.add('active');
            item.classList.add('active');
            const [t, s] = titles[section] || ['Dashboard', ''];
            document.getElementById('doc-page-title').textContent = t;
            document.getElementById('doc-page-subtitle').textContent = s;
        });
    });

    portal.querySelector('.portal-sidebar-toggle')?.addEventListener('click', () => {
        portal.querySelector('.portal-sidebar')?.classList.toggle('open');
    });

    document.getElementById('doc-add-record-btn')?.addEventListener('click', () => {
        showToast('Use Victor AI or Admin to add records', 'info');
    });
}
