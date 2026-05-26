// =============================================
// Patient Portal — Real-time Dashboard
// =============================================
import { supabase } from './supabase.js';
import { getUserProfile } from './auth.js';
import { showToast, statusBadge, formatDate } from './ui.js';

let myAppointments = [];
let myRecords = [];
let myBills = [];
let doctorNames = {};

function formatTime(time) {
    if (!time) return '—';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    let h = parseInt(parts[0]), m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

export async function initPatientPortal() {
    const profile = getUserProfile();
    document.getElementById('pat-email-display').textContent = profile?.email || '';

    // Find patient_id linked to this user's email
    const patientId = await getMyPatientId();
    if (!patientId) {
        showToast('No patient record linked to this account yet', 'warning');
    }

    await Promise.all([loadPatAppointments(patientId), loadPatRecords(patientId), loadPatBills(patientId)]);
    updatePatStats();
    initPatRealtime(patientId);
    initPatNavigation();
}

async function getMyPatientId() {
    const profile = getUserProfile();
    const email = profile?.email || '';
    const { data } = await supabase.from('patients').select('patient_id').eq('email', email).single();
    return data?.patient_id || null;
}

async function loadPatAppointments(patientId) {
    if (!patientId) { myAppointments = []; renderPatAppointments(); renderPatUpcoming(); return; }
    const { data } = await supabase.from('appointments').select('*').eq('patient_id', patientId).order('date', { ascending: false });
    myAppointments = data || [];

    // Fetch doctor names for display
    const docIds = [...new Set(myAppointments.map(a => a.doctor_id).filter(Boolean))];
    if (docIds.length > 0) {
        const { data: docs } = await supabase.from('doctors').select('doctor_id, name').in('doctor_id', docIds);
        if (docs) docs.forEach(d => { doctorNames[d.doctor_id] = d.name; });
    }

    renderPatAppointments();
    renderPatUpcoming();
}

async function loadPatRecords(patientId) {
    if (!patientId) { myRecords = []; renderPatRecords(); return; }
    const { data } = await supabase.from('medical_records').select('*').eq('patient_id', patientId).order('date', { ascending: false });
    myRecords = data || [];
    renderPatRecords();
}

async function loadPatBills(patientId) {
    if (!patientId) { myBills = []; renderPatBills(); return; }
    const { data } = await supabase.from('bills').select('*').eq('patient_id', patientId).order('date', { ascending: false });
    myBills = data || [];
    renderPatBills();
}

function updatePatStats() {
    document.getElementById('pat-total-appointments').textContent = myAppointments.length;
    document.getElementById('pat-total-records').textContent = myRecords.length;
    document.getElementById('pat-total-bills').textContent = myBills.length;
    const pending = myBills.filter(b => b.payment_status === 'pending').reduce((sum, b) => sum + (b.consultation_fee || 0) + (b.test_charges || 0) + (b.medication_charges || 0) + (b.room_charges || 0), 0);
    document.getElementById('pat-pending-amount').textContent = `₹${pending.toLocaleString()}`;
}

function renderPatUpcoming() {
    const tbody = document.getElementById('pat-upcoming-tbody');
    const today = new Date().toISOString().split('T')[0];
    const upcoming = myAppointments.filter(a => a.date >= today && a.status !== 'completed').slice(0, 5);
    if (upcoming.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No upcoming appointments</td></tr>'; return; }
    tbody.innerHTML = upcoming.map(a => `<tr class="table-row-animate"><td>${doctorNames[a.doctor_id] || a.doctor_id}</td><td>${formatDate(a.date)}</td><td>${formatTime(a.time)}</td><td>${statusBadge(a.status)}</td></tr>`).join('');
}

function renderPatAppointments() {
    const tbody = document.getElementById('pat-appointments-tbody');
    if (myAppointments.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No appointments found</td></tr>'; return; }
    tbody.innerHTML = myAppointments.map(a => `<tr class="table-row-animate"><td>${doctorNames[a.doctor_id] || a.doctor_id}</td><td>${formatDate(a.date)}</td><td>${formatTime(a.time)}</td><td>${statusBadge(a.status)}</td><td>${a.notes || '—'}</td></tr>`).join('');
}

function renderPatRecords() {
    const tbody = document.getElementById('pat-records-tbody');
    if (myRecords.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No records found</td></tr>'; return; }
    tbody.innerHTML = myRecords.map(r => `<tr class="table-row-animate"><td>${formatDate(r.date)}</td><td>${r.doctor_name || '—'}</td><td><span class="record-type-badge">${r.record_type || 'visit'}</span></td><td>${r.diagnosis}</td><td>${r.prescription || '—'}</td></tr>`).join('');
}

function renderPatBills() {
    const tbody = document.getElementById('pat-bills-tbody');
    if (myBills.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No bills found</td></tr>'; return; }
    tbody.innerHTML = myBills.map(b => {
        const total = (b.consultation_fee || 0) + (b.test_charges || 0) + (b.medication_charges || 0) + (b.room_charges || 0);
        return `<tr class="table-row-animate"><td><span class="id-badge">${b.bill_number}</span></td><td>${formatDate(b.date)}</td><td>₹${b.consultation_fee || 0}</td><td>₹${b.test_charges || 0}</td><td><strong>₹${total.toLocaleString()}</strong></td><td>${statusBadge(b.payment_status)}</td></tr>`;
    }).join('');
}

function initPatRealtime(patientId) {
    if (!patientId) return;
    supabase.channel('pat-appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
        await loadPatAppointments(patientId);
        updatePatStats();
    }).subscribe();

    supabase.channel('pat-records').on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records' }, async () => {
        await loadPatRecords(patientId);
        updatePatStats();
    }).subscribe();

    supabase.channel('pat-bills').on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, async () => {
        await loadPatBills(patientId);
        updatePatStats();
    }).subscribe();
}

function initPatNavigation() {
    const portal = document.getElementById('patient-portal');
    const titles = { 'pat-dashboard': ['Dashboard', 'Patient Overview'], 'pat-appointments': ['My Appointments', 'Scheduled visits'], 'pat-records': ['My Records', 'Medical history'], 'pat-bills': ['My Bills', 'Payment history'] };

    portal.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            portal.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            portal.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(`section-${section}`)?.classList.add('active');
            item.classList.add('active');
            const [t, s] = titles[section] || ['Dashboard', ''];
            document.getElementById('pat-page-title').textContent = t;
            document.getElementById('pat-page-subtitle').textContent = s;
        });
    });

    portal.querySelector('.portal-sidebar-toggle')?.addEventListener('click', () => {
        portal.querySelector('.portal-sidebar')?.classList.toggle('open');
    });
}
