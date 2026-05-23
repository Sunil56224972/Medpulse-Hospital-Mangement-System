// =============================================
// Patients Module — CRUD + Real-time
// =============================================
import { supabase } from './supabase.js';
import { showToast, openModal, statusBadge, formatDate } from './ui.js';

let patientsCache = [];
let onUpdateCallback = null;

export function getPatients() { return patientsCache; }

export async function loadPatients() {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load patients', 'error'); return []; }
    patientsCache = data || [];
    renderPatientsTable(patientsCache);
    return patientsCache;
}

export function initPatientsRealtime(onUpdate) {
    onUpdateCallback = onUpdate;
    supabase
        .channel('patients-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
            loadPatients().then(() => onUpdateCallback && onUpdateCallback());
        })
        .subscribe();
}

export function renderPatientsTable(patients) {
    const tbody = document.getElementById('patients-tbody');
    if (!patients || patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><span class="material-symbols-rounded">person_off</span> No patients found</td></tr>';
        return;
    }
    tbody.innerHTML = patients.map(p => `
        <tr class="table-row-animate">
            <td><span class="id-badge">${p.patient_id}</span></td>
            <td class="name-cell">${p.name}</td>
            <td>${p.age}</td>
            <td>${p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</td>
            <td>${p.disease}</td>
            <td>${p.blood_group || '—'}</td>
            <td>${p.phone || '—'}</td>
            <td>${statusBadge(p.admission_status)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" data-id="${p.patient_id}" title="Edit">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn-icon btn-delete" data-id="${p.patient_id}" title="Delete">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    // Edit handlers
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditPatientModal(btn.dataset.id));
    });
    // Delete handlers
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deletePatient(btn.dataset.id));
    });
}

function getPatientFormHTML(p = {}) {
    return `
    <form class="modal-form" id="patient-modal-form">
        <div class="form-row">
            <div class="form-group">
                <label>Patient ID <span class="required">*</span></label>
                <input type="text" name="patient_id" value="${p.patient_id || ''}" required ${p.patient_id ? 'readonly' : ''} placeholder="e.g. P001" />
            </div>
            <div class="form-group">
                <label>Full Name <span class="required">*</span></label>
                <input type="text" name="name" value="${p.name || ''}" required placeholder="Patient name" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Age <span class="required">*</span></label>
                <input type="number" name="age" value="${p.age || ''}" required min="1" max="149" placeholder="Age" />
            </div>
            <div class="form-group">
                <label>Gender <span class="required">*</span></label>
                <select name="gender" required>
                    <option value="" disabled ${!p.gender ? 'selected' : ''}>Select</option>
                    <option value="M" ${p.gender === 'M' ? 'selected' : ''}>Male</option>
                    <option value="F" ${p.gender === 'F' ? 'selected' : ''}>Female</option>
                    <option value="O" ${p.gender === 'O' ? 'selected' : ''}>Other</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Disease <span class="required">*</span></label>
                <input type="text" name="disease" value="${p.disease || ''}" required placeholder="Diagnosis" />
            </div>
            <div class="form-group">
                <label>Blood Group</label>
                <select name="blood_group">
                    <option value="">Select</option>
                    ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => `<option value="${bg}" ${p.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value="${p.phone || ''}" placeholder="Phone number" />
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${p.email || ''}" placeholder="Email" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Admission Status</label>
                <select name="admission_status">
                    <option value="outpatient" ${p.admission_status === 'outpatient' ? 'selected' : ''}>Outpatient</option>
                    <option value="admitted" ${p.admission_status === 'admitted' ? 'selected' : ''}>Admitted</option>
                    <option value="discharged" ${p.admission_status === 'discharged' ? 'selected' : ''}>Discharged</option>
                </select>
            </div>
        </div>
        <div class="modal-actions">
            <button type="submit" class="btn btn-primary"><span class="material-symbols-rounded">save</span> Save</button>
        </div>
    </form>`;
}

export function openAddPatientModal() {
    openModal('Add New Patient', getPatientFormHTML(), async (formData) => {
        const record = Object.fromEntries(formData);
        record.age = parseInt(record.age);
        if (!record.blood_group) delete record.blood_group;
        if (!record.phone) delete record.phone;
        if (!record.email) delete record.email;

        const { error } = await supabase.from('patients').insert([record]);
        if (error) throw new Error(error.message);
        showToast('Patient added successfully!', 'success');
        await loadPatients();
        if (onUpdateCallback) onUpdateCallback();
    });
}

async function openEditPatientModal(patientId) {
    const patient = patientsCache.find(p => p.patient_id === patientId);
    if (!patient) return;

    openModal('Edit Patient', getPatientFormHTML(patient), async (formData) => {
        const record = Object.fromEntries(formData);
        record.age = parseInt(record.age);

        const { error } = await supabase.from('patients').update(record).eq('patient_id', patientId);
        if (error) throw new Error(error.message);
        showToast('Patient updated!', 'success');
        await loadPatients();
        if (onUpdateCallback) onUpdateCallback();
    });
}

async function deletePatient(patientId) {
    if (!confirm(`Delete patient ${patientId}? This will also remove related appointments and bills.`)) return;
    const { error } = await supabase.from('patients').delete().eq('patient_id', patientId);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Patient deleted', 'info');
    await loadPatients();
    if (onUpdateCallback) onUpdateCallback();
}

export function filterPatients(query) {
    const q = query.toLowerCase();
    const filtered = patientsCache.filter(p =>
        p.patient_id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.disease.toLowerCase().includes(q)
    );
    renderPatientsTable(filtered);
}
