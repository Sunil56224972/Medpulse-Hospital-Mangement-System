import { supabase } from './supabase.js';
import { showToast, openModal, statusBadge, formatDate } from './ui.js';
import { getPatients } from './patients.js';
import { getDoctors } from './doctors.js';

let appointmentsCache = [];
let onUpdateCallback = null;

export function getAppointments() { return appointmentsCache; }

export async function loadAppointments() {
    const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: false });
    if (error) { showToast('Failed to load appointments', 'error'); return []; }
    appointmentsCache = data || [];
    renderAppointmentsTable(appointmentsCache);
    return appointmentsCache;
}

export function initAppointmentsRealtime(onUpdate) {
    onUpdateCallback = onUpdate;
    supabase.channel('appointments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
            loadAppointments().then(() => onUpdateCallback && onUpdateCallback());
        }).subscribe();
}

function getPatientName(pid) { const p = getPatients().find(pt => pt.patient_id === pid); return p ? p.name : pid; }
function getDoctorName(did) { const d = getDoctors().find(dc => dc.doctor_id === did); return d ? d.name : did; }

export function renderAppointmentsTable(list) {
    const tbody = document.getElementById('appointments-tbody');
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-symbols-rounded">event_busy</span> No appointments</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(a => `<tr class="table-row-animate">
        <td><span class="id-badge">${a.patient_id}</span></td><td>${getPatientName(a.patient_id)}</td>
        <td><span class="id-badge">${a.doctor_id}</span></td><td>${getDoctorName(a.doctor_id)}</td>
        <td>${formatDate(a.date)}</td><td>${a.time ? a.time.substring(0,5) : '—'}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="actions-cell">
            <button class="btn-icon btn-edit" data-id="${a.id}"><span class="material-symbols-rounded">edit</span></button>
            <button class="btn-icon btn-delete" data-id="${a.id}"><span class="material-symbols-rounded">delete</span></button>
        </td></tr>`).join('');
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openEditAppointmentModal(b.dataset.id)));
    tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteAppointment(b.dataset.id)));
}

function formHTML(a = {}) {
    const patients = getPatients(), doctors = getDoctors();
    return `<form class="modal-form">
        <div class="form-row"><div class="form-group"><label>Patient *</label>
            <select name="patient_id" required><option value="" disabled ${!a.patient_id?'selected':''}>Select</option>
            ${patients.map(p=>`<option value="${p.patient_id}" ${a.patient_id===p.patient_id?'selected':''}>${p.patient_id} — ${p.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Doctor *</label>
            <select name="doctor_id" required><option value="" disabled ${!a.doctor_id?'selected':''}>Select</option>
            ${doctors.map(d=>`<option value="${d.doctor_id}" ${a.doctor_id===d.doctor_id?'selected':''}>${d.doctor_id} — ${d.name} (${d.specialization})</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>Date *</label><input type="date" name="date" value="${a.date||''}" required /></div>
        <div class="form-group"><label>Time</label><input type="time" name="time" value="${a.time?a.time.substring(0,5):''}" /></div></div>
        <div class="form-row"><div class="form-group"><label>Status</label><select name="status">
            <option value="scheduled" ${a.status==='scheduled'?'selected':''}>Scheduled</option>
            <option value="completed" ${a.status==='completed'?'selected':''}>Completed</option>
            <option value="cancelled" ${a.status==='cancelled'?'selected':''}>Cancelled</option>
            <option value="no_show" ${a.status==='no_show'?'selected':''}>No Show</option></select></div>
        <div class="form-group"><label>Notes</label><input type="text" name="notes" value="${a.notes||''}" placeholder="Optional" /></div></div>
        <div class="modal-actions"><button type="submit" class="btn btn-primary"><span class="material-symbols-rounded">save</span> Save</button></div></form>`;
}

export function openAddAppointmentModal() {
    if (getPatients().length === 0 || getDoctors().length === 0) { showToast('Add patients & doctors first', 'warning'); return; }
    openModal('Schedule Appointment', formHTML(), async (fd) => {
        const r = Object.fromEntries(fd); if (!r.time) delete r.time; if (!r.notes) delete r.notes;
        const { error } = await supabase.from('appointments').insert([r]);
        if (error) throw new Error(error.message);
        showToast('Appointment scheduled!', 'success'); await loadAppointments(); onUpdateCallback?.();
    });
}

async function openEditAppointmentModal(id) {
    const apt = appointmentsCache.find(a => a.id === id); if (!apt) return;
    openModal('Edit Appointment', formHTML(apt), async (fd) => {
        const r = Object.fromEntries(fd); if (!r.time) delete r.time;
        const { error } = await supabase.from('appointments').update(r).eq('id', id);
        if (error) throw new Error(error.message);
        showToast('Appointment updated!', 'success'); await loadAppointments(); onUpdateCallback?.();
    });
}

async function deleteAppointment(id) {
    if (!confirm('Delete this appointment?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Appointment deleted', 'info'); await loadAppointments(); onUpdateCallback?.();
}

export function filterAppointments(q) {
    q = q.toLowerCase();
    renderAppointmentsTable(appointmentsCache.filter(a =>
        a.patient_id.toLowerCase().includes(q) || a.doctor_id.toLowerCase().includes(q) ||
        getPatientName(a.patient_id).toLowerCase().includes(q) || getDoctorName(a.doctor_id).toLowerCase().includes(q)));
}
