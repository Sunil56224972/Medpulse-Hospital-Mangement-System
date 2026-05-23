// =============================================
// Medical History Module — CRUD + Real-time
// =============================================
import { supabase } from './supabase.js';
import { showToast, openModal, statusBadge, formatDate } from './ui.js';
import { getPatients } from './patients.js';
import { getDoctors } from './doctors.js';

let recordsCache = [];
let onUpdateCallback = null;

export function getRecords() { return recordsCache; }

export async function loadMedicalRecords() {
    const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .order('date', { ascending: false });

    if (error) { showToast('Failed to load medical records', 'error'); return []; }
    recordsCache = data || [];
    renderRecordsTable(recordsCache);
    return recordsCache;
}

export function initMedicalRecordsRealtime(onUpdate) {
    onUpdateCallback = onUpdate;
    supabase
        .channel('medical-records-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records' }, () => {
            loadMedicalRecords().then(() => onUpdateCallback && onUpdateCallback());
        })
        .subscribe();
}

const typeLabels = {
    visit: 'Visit',
    lab_result: 'Lab Result',
    surgery: 'Surgery',
    follow_up: 'Follow-up',
    emergency: 'Emergency'
};

const typeColors = {
    visit: '#0077b6',
    lab_result: '#7c3aed',
    surgery: '#dc2626',
    follow_up: '#0d9488',
    emergency: '#f59e0b'
};

export function renderRecordsTable(list) {
    const tbody = document.getElementById('records-tbody');
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-symbols-rounded">medical_information</span> No medical records found</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(r => {
        const patientName = getPatients().find(p => p.patient_id === r.patient_id)?.name || r.patient_id;
        return `<tr class="table-row-animate">
            <td><span class="id-badge">${r.patient_id}</span></td>
            <td class="name-cell">${patientName}</td>
            <td>${formatDate(r.date)}</td>
            <td><span class="record-type-badge" style="background:${typeColors[r.record_type] || '#666'}">${typeLabels[r.record_type] || r.record_type}</span></td>
            <td>${r.diagnosis}</td>
            <td>${r.prescription || '—'}</td>
            <td>${r.doctor_name || '—'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" data-id="${r.id}" title="View Details"><span class="material-symbols-rounded">visibility</span></button>
                <button class="btn-icon btn-edit" data-id="${r.id}" title="Edit"><span class="material-symbols-rounded">edit</span></button>
                <button class="btn-icon btn-delete" data-id="${r.id}" title="Delete"><span class="material-symbols-rounded">delete</span></button>
            </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', () => viewRecordDetail(b.dataset.id)));
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openEditRecordModal(b.dataset.id)));
    tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteRecord(b.dataset.id)));
}

function getRecordFormHTML(r = {}) {
    const patients = getPatients();
    const doctors = getDoctors();
    return `
    <form class="modal-form">
        <div class="form-row">
            <div class="form-group"><label>Patient <span class="required">*</span></label>
                <select name="patient_id" required>
                    <option value="" disabled ${!r.patient_id ? 'selected' : ''}>Select Patient</option>
                    ${patients.map(p => `<option value="${p.patient_id}" ${r.patient_id === p.patient_id ? 'selected' : ''}>${p.patient_id} — ${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Date <span class="required">*</span></label>
                <input type="date" name="date" value="${r.date || new Date().toISOString().split('T')[0]}" required />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Record Type</label>
                <select name="record_type">
                    ${Object.entries(typeLabels).map(([k, v]) => `<option value="${k}" ${r.record_type === k ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Doctor</label>
                <select name="doctor_name">
                    <option value="">Select Doctor</option>
                    ${doctors.map(d => `<option value="${d.name}" ${r.doctor_name === d.name ? 'selected' : ''}>Dr. ${d.name} (${d.specialization})</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-group"><label>Diagnosis <span class="required">*</span></label>
            <textarea name="diagnosis" rows="2" required placeholder="Enter diagnosis...">${r.diagnosis || ''}</textarea>
        </div>
        <div class="form-group"><label>Prescription</label>
            <textarea name="prescription" rows="2" placeholder="Medications, dosage, instructions...">${r.prescription || ''}</textarea>
        </div>
        <div class="form-group"><label>Notes</label>
            <textarea name="notes" rows="2" placeholder="Additional notes...">${r.notes || ''}</textarea>
        </div>
        <div class="modal-actions"><button type="submit" class="btn btn-primary"><span class="material-symbols-rounded">save</span> Save Record</button></div>
    </form>`;
}

export function openAddRecordModal() {
    if (getPatients().length === 0) { showToast('Add patients first', 'warning'); return; }
    openModal('Add Medical Record', getRecordFormHTML(), async (fd) => {
        const r = Object.fromEntries(fd);
        if (!r.doctor_name) delete r.doctor_name;
        if (!r.prescription) delete r.prescription;
        if (!r.notes) delete r.notes;
        const { error } = await supabase.from('medical_records').insert([r]);
        if (error) throw new Error(error.message);
        showToast('Medical record added!', 'success');
        await loadMedicalRecords();
        onUpdateCallback?.();
    });
}

async function openEditRecordModal(id) {
    const rec = recordsCache.find(r => r.id === id);
    if (!rec) return;
    openModal('Edit Medical Record', getRecordFormHTML(rec), async (fd) => {
        const r = Object.fromEntries(fd);
        const { error } = await supabase.from('medical_records').update(r).eq('id', id);
        if (error) throw new Error(error.message);
        showToast('Record updated!', 'success');
        await loadMedicalRecords();
        onUpdateCallback?.();
    });
}

function viewRecordDetail(id) {
    const r = recordsCache.find(rec => rec.id === id);
    if (!r) return;
    const patientName = getPatients().find(p => p.patient_id === r.patient_id)?.name || r.patient_id;
    const html = `
    <div class="record-detail">
        <div class="detail-header">
            <span class="record-type-badge" style="background:${typeColors[r.record_type] || '#666'};font-size:.85rem;padding:.4rem 1rem">${typeLabels[r.record_type] || r.record_type}</span>
            <span style="color:rgba(255,255,255,.5);font-size:.85rem">${formatDate(r.date)}</span>
        </div>
        <div class="detail-grid">
            <div class="detail-item"><label>Patient</label><p>${patientName} (${r.patient_id})</p></div>
            <div class="detail-item"><label>Doctor</label><p>${r.doctor_name ? 'Dr. ' + r.doctor_name : '—'}</p></div>
        </div>
        <div class="detail-item" style="margin-top:1rem"><label>Diagnosis</label><p>${r.diagnosis}</p></div>
        ${r.prescription ? `<div class="detail-item" style="margin-top:.8rem"><label>Prescription</label><p style="white-space:pre-wrap">${r.prescription}</p></div>` : ''}
        ${r.notes ? `<div class="detail-item" style="margin-top:.8rem"><label>Notes</label><p style="white-space:pre-wrap">${r.notes}</p></div>` : ''}
    </div>`;
    openModal('Medical Record Details', html);
}

async function deleteRecord(id) {
    if (!confirm('Delete this medical record?')) return;
    const { error } = await supabase.from('medical_records').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Record deleted', 'info');
    await loadMedicalRecords();
    onUpdateCallback?.();
}

export function filterRecords(q) {
    q = q.toLowerCase();
    renderRecordsTable(recordsCache.filter(r => {
        const patientName = getPatients().find(p => p.patient_id === r.patient_id)?.name || '';
        return r.patient_id.toLowerCase().includes(q) ||
            patientName.toLowerCase().includes(q) ||
            r.diagnosis.toLowerCase().includes(q) ||
            (r.doctor_name || '').toLowerCase().includes(q);
    }));
}
