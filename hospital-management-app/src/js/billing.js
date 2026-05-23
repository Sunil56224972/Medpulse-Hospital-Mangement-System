import { supabase } from './supabase.js';
import { showToast, openModal, statusBadge, formatDate, formatCurrency } from './ui.js';
import { getPatients } from './patients.js';
import { jsPDF } from 'jspdf';

let billsCache = [];
let onUpdateCallback = null;

export function getBills() { return billsCache; }

export async function loadBills() {
    const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
    if (error) { showToast('Failed to load bills', 'error'); return []; }
    billsCache = data || [];
    renderBillsTable(billsCache);
    return billsCache;
}

export function initBillsRealtime(onUpdate) {
    onUpdateCallback = onUpdate;
    supabase.channel('bills-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
            loadBills().then(() => onUpdateCallback && onUpdateCallback());
        }).subscribe();
}

export function renderBillsTable(list) {
    const tbody = document.getElementById('bills-tbody');
    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state"><span class="material-symbols-rounded">receipt_long</span> No bills found</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(b => `<tr class="table-row-animate">
        <td><span class="id-badge">${b.bill_number}</span></td>
        <td><span class="id-badge">${b.patient_id}</span></td>
        <td>${formatDate(b.date)}</td>
        <td>${formatCurrency(b.consultation_fee)}</td>
        <td>${formatCurrency(b.test_charges)}</td>
        <td>${formatCurrency(b.medication_charges)}</td>
        <td>${formatCurrency(b.room_charges)}</td>
        <td class="total-cell">${formatCurrency(b.total)}</td>
        <td>${statusBadge(b.payment_status)}</td>
        <td class="actions-cell">
            <button class="btn-icon btn-pdf" data-id="${b.id}" title="Download PDF"><span class="material-symbols-rounded">picture_as_pdf</span></button>
            <button class="btn-icon btn-edit" data-id="${b.id}" title="Edit"><span class="material-symbols-rounded">edit</span></button>
            <button class="btn-icon btn-delete" data-id="${b.id}" title="Delete"><span class="material-symbols-rounded">delete</span></button>
        </td></tr>`).join('');
    tbody.querySelectorAll('.btn-pdf').forEach(b => b.addEventListener('click', () => generatePDF(b.dataset.id)));
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openEditBillModal(b.dataset.id)));
    tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteBill(b.dataset.id)));
}

// ============ PDF INVOICE GENERATOR ============

// ASCII-safe number formatter for jsPDF (avoids Unicode locale chars)
function fmtNum(val) {
    const num = parseFloat(val || 0);
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    // Indian numbering: last 3 digits, then groups of 2
    let result = '';
    const digits = intPart.replace('-', '');
    if (digits.length <= 3) {
        result = digits;
    } else {
        result = digits.slice(-3);
        let remaining = digits.slice(0, -3);
        while (remaining.length > 2) {
            result = remaining.slice(-2) + ',' + result;
            remaining = remaining.slice(0, -2);
        }
        if (remaining.length > 0) result = remaining + ',' + result;
    }
    if (num < 0) result = '-' + result;
    return result + '.' + decPart;
}

function generatePDF(id) {
    const bill = billsCache.find(b => b.id === id);
    if (!bill) return;
    const patient = getPatients().find(p => p.patient_id === bill.patient_id);
    const patientName = patient?.name || bill.patient_id;

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(8, 20, 35);
    doc.rect(0, 0, pageW, 45, 'F');

    // Hospital name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MedPulse', 20, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Hospital Management System', 20, 30);

    // Invoice label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageW - 20, 22, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(bill.bill_number, pageW - 20, 30, { align: 'right' });

    // Teal accent line
    doc.setFillColor(94, 234, 212);
    doc.rect(0, 45, pageW, 3, 'F');

    // Patient & Bill Info
    let y = 60;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, y);
    doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text('Patient: ' + patientName, 20, y);
    y += 6;
    doc.text('Patient ID: ' + bill.patient_id, 20, y);
    if (patient?.phone) { y += 6; doc.text('Phone: ' + patient.phone, 20, y); }
    if (patient?.email) { y += 6; doc.text('Email: ' + patient.email, 20, y); }

    // Date & Payment Info (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details:', pageW - 80, 60);
    doc.setFont('helvetica', 'normal');
    const billDate = bill.date ? new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    doc.text('Date: ' + billDate, pageW - 80, 67);
    doc.text('Status: ' + (bill.payment_status || 'N/A').toUpperCase(), pageW - 80, 73);
    if (bill.payment_method) doc.text('Method: ' + bill.payment_method.toUpperCase(), pageW - 80, 79);

    // Table
    y = Math.max(y, 85) + 15;
    const tableX = 20;

    // Table header
    doc.setFillColor(240, 248, 255);
    doc.rect(tableX, y - 6, pageW - 40, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 20, 35);
    doc.text('Description', tableX + 5, y);
    doc.text('Amount (Rs.)', pageW - 25, y, { align: 'right' });

    // Table rows
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const items = [
        ['Consultation Fee', bill.consultation_fee],
        ['Test Charges', bill.test_charges],
        ['Medication Charges', bill.medication_charges],
        ['Room Charges', bill.room_charges],
    ];

    items.forEach(([label, amount]) => {
        doc.setDrawColor(230, 230, 230);
        doc.line(tableX, y + 3, pageW - 20, y + 3);
        doc.text(label, tableX + 5, y);
        doc.text('Rs. ' + fmtNum(amount), pageW - 25, y, { align: 'right' });
        y += 10;
    });

    // Total
    y += 2;
    doc.setFillColor(8, 20, 35);
    doc.rect(pageW - 110, y - 6, 90, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total: Rs. ' + fmtNum(bill.total), pageW - 25, y + 1, { align: 'right' });

    // Footer
    y = 260;
    doc.setDrawColor(94, 234, 212);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageW - 20, y);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated invoice. No signature required.', pageW / 2, y + 8, { align: 'center' });
    doc.text('Generated on ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' by MedPulse HMS', pageW / 2, y + 14, { align: 'center' });

    // Save
    doc.save('Invoice_' + bill.bill_number + '.pdf');
    showToast('Invoice PDF downloaded!', 'success');
}

function formHTML(b = {}) {
    const patients = getPatients();
    const billNum = b.bill_number || ('BILL-' + Date.now().toString(36).toUpperCase());
    return `<form class="modal-form">
        <div class="form-row">
            <div class="form-group"><label>Bill Number</label><input type="text" name="bill_number" value="${billNum}" readonly /></div>
            <div class="form-group"><label>Patient *</label>
                <select name="patient_id" required><option value="" disabled ${!b.patient_id?'selected':''}>Select</option>
                ${patients.map(p=>`<option value="${p.patient_id}" ${b.patient_id===p.patient_id?'selected':''}>${p.patient_id} — ${p.name}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Date *</label><input type="date" name="date" value="${b.date || new Date().toISOString().split('T')[0]}" required /></div>
            <div class="form-group"><label>Payment Method</label>
                <select name="payment_method">
                    <option value="">Select</option>
                    ${['cash','card','insurance','upi','other'].map(m=>`<option value="${m}" ${b.payment_method===m?'selected':''}>${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join('')}
                </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Consultation Fee</label><input type="number" name="consultation_fee" value="${b.consultation_fee||0}" min="0" step="0.01" /></div>
            <div class="form-group"><label>Test Charges</label><input type="number" name="test_charges" value="${b.test_charges||0}" min="0" step="0.01" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Medication Charges</label><input type="number" name="medication_charges" value="${b.medication_charges||0}" min="0" step="0.01" /></div>
            <div class="form-group"><label>Room Charges</label><input type="number" name="room_charges" value="${b.room_charges||0}" min="0" step="0.01" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Payment Status</label>
                <select name="payment_status">
                    <option value="pending" ${b.payment_status==='pending'?'selected':''}>Pending</option>
                    <option value="paid" ${b.payment_status==='paid'?'selected':''}>Paid</option>
                    <option value="partial" ${b.payment_status==='partial'?'selected':''}>Partial</option>
                    <option value="overdue" ${b.payment_status==='overdue'?'selected':''}>Overdue</option>
                </select></div>
        </div>
        <div class="modal-actions"><button type="submit" class="btn btn-primary"><span class="material-symbols-rounded">save</span> Save</button></div></form>`;
}

export function openAddBillModal() {
    if (getPatients().length === 0) { showToast('Add patients first', 'warning'); return; }
    openModal('Generate Bill', formHTML(), async (fd) => {
        const r = Object.fromEntries(fd);
        r.consultation_fee = parseFloat(r.consultation_fee) || 0;
        r.test_charges = parseFloat(r.test_charges) || 0;
        r.medication_charges = parseFloat(r.medication_charges) || 0;
        r.room_charges = parseFloat(r.room_charges) || 0;
        if (!r.payment_method) delete r.payment_method;
        const { error } = await supabase.from('bills').insert([r]);
        if (error) throw new Error(error.message);
        showToast('Bill generated!', 'success'); await loadBills(); onUpdateCallback?.();
    });
}

async function openEditBillModal(id) {
    const bill = billsCache.find(b => b.id === id); if (!bill) return;
    openModal('Edit Bill', formHTML(bill), async (fd) => {
        const r = Object.fromEntries(fd);
        r.consultation_fee = parseFloat(r.consultation_fee) || 0;
        r.test_charges = parseFloat(r.test_charges) || 0;
        r.medication_charges = parseFloat(r.medication_charges) || 0;
        r.room_charges = parseFloat(r.room_charges) || 0;
        const { error } = await supabase.from('bills').update(r).eq('id', id);
        if (error) throw new Error(error.message);
        showToast('Bill updated!', 'success'); await loadBills(); onUpdateCallback?.();
    });
}

async function deleteBill(id) {
    if (!confirm('Delete this bill?')) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Bill deleted', 'info'); await loadBills(); onUpdateCallback?.();
}

export function filterBills(q) {
    q = q.toLowerCase();
    renderBillsTable(billsCache.filter(b =>
        b.bill_number.toLowerCase().includes(q) || b.patient_id.toLowerCase().includes(q)));
}
