// =============================================
// Doctors Module — CRUD + Real-time
// =============================================
import { supabase } from './supabase.js';
import { showToast, openModal, statusBadge } from './ui.js';

let doctorsCache = [];
let onUpdateCallback = null;

export function getDoctors() { return doctorsCache; }

export async function loadDoctors() {
    const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load doctors', 'error'); return []; }
    doctorsCache = data || [];
    renderDoctorsTable(doctorsCache);
    return doctorsCache;
}

export function initDoctorsRealtime(onUpdate) {
    onUpdateCallback = onUpdate;
    supabase
        .channel('doctors-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
            loadDoctors().then(() => onUpdateCallback && onUpdateCallback());
        })
        .subscribe();
}

export function renderDoctorsTable(doctors) {
    const tbody = document.getElementById('doctors-tbody');
    if (!doctors || doctors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-symbols-rounded">person_off</span> No doctors found</td></tr>';
        return;
    }
    tbody.innerHTML = doctors.map(d => `
        <tr class="table-row-animate">
            <td><span class="id-badge">${d.doctor_id}</span></td>
            <td class="name-cell">${d.name}</td>
            <td>${d.age}</td>
            <td>${d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : 'Other'}</td>
            <td><span class="specialization-tag">${d.specialization}</span></td>
            <td>${d.phone || '—'}</td>
            <td>${statusBadge(d.status)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" data-id="${d.doctor_id}" title="Edit">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn-icon btn-delete" data-id="${d.doctor_id}" title="Delete">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditDoctorModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteDoctor(btn.dataset.id));
    });
}

function getDoctorFormHTML(d = {}) {
    return `
    <form class="modal-form" id="doctor-modal-form">
        <div class="form-row">
            <div class="form-group">
                <label>Doctor ID <span class="required">*</span></label>
                <input type="text" name="doctor_id" value="${d.doctor_id || ''}" required ${d.doctor_id ? 'readonly' : ''} placeholder="e.g. D001" />
            </div>
            <div class="form-group">
                <label>Full Name <span class="required">*</span></label>
                <input type="text" name="name" value="${d.name || ''}" required placeholder="Doctor name" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Age <span class="required">*</span></label>
                <input type="number" name="age" value="${d.age || ''}" required min="1" max="149" placeholder="Age" />
            </div>
            <div class="form-group">
                <label>Gender <span class="required">*</span></label>
                <select name="gender" required>
                    <option value="" disabled ${!d.gender ? 'selected' : ''}>Select</option>
                    <option value="M" ${d.gender === 'M' ? 'selected' : ''}>Male</option>
                    <option value="F" ${d.gender === 'F' ? 'selected' : ''}>Female</option>
                    <option value="O" ${d.gender === 'O' ? 'selected' : ''}>Other</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Specialization <span class="required">*</span></label>
                <input type="text" name="specialization" value="${d.specialization || ''}" required placeholder="e.g. Cardiology" />
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status">
                    <option value="active" ${d.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="on_leave" ${d.status === 'on_leave' ? 'selected' : ''}>On Leave</option>
                    <option value="inactive" ${d.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value="${d.phone || ''}" placeholder="Phone number" />
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${d.email || ''}" placeholder="Email" />
            </div>
        </div>
        <div class="modal-actions">
            <button type="submit" class="btn btn-primary"><span class="material-symbols-rounded">save</span> Save</button>
        </div>
    </form>`;
}

export function openAddDoctorModal() {
    openModal('Add New Doctor', getDoctorFormHTML(), async (formData) => {
        const record = Object.fromEntries(formData);
        record.age = parseInt(record.age);
        if (!record.phone) delete record.phone;
        if (!record.email) delete record.email;

        const { error } = await supabase.from('doctors').insert([record]);
        if (error) throw new Error(error.message);
        showToast('Doctor added successfully!', 'success');
        await loadDoctors();
        if (onUpdateCallback) onUpdateCallback();
    });
}

async function openEditDoctorModal(doctorId) {
    const doctor = doctorsCache.find(d => d.doctor_id === doctorId);
    if (!doctor) return;

    openModal('Edit Doctor', getDoctorFormHTML(doctor), async (formData) => {
        const record = Object.fromEntries(formData);
        record.age = parseInt(record.age);

        const { error } = await supabase.from('doctors').update(record).eq('doctor_id', doctorId);
        if (error) throw new Error(error.message);
        showToast('Doctor updated!', 'success');
        await loadDoctors();
        if (onUpdateCallback) onUpdateCallback();
    });
}

async function deleteDoctor(doctorId) {
    if (!confirm(`Delete doctor ${doctorId}? This will also remove related appointments.`)) return;
    const { error } = await supabase.from('doctors').delete().eq('doctor_id', doctorId);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Doctor deleted', 'info');
    await loadDoctors();
    if (onUpdateCallback) onUpdateCallback();
}

export function filterDoctors(query) {
    const q = query.toLowerCase();
    const filtered = doctorsCache.filter(d =>
        d.doctor_id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q)
    );
    renderDoctorsTable(filtered);
}
