import { getPatients } from './patients.js';
import { getDoctors } from './doctors.js';
import { getAppointments } from './appointments.js';
import { getBills } from './billing.js';
import { animateCounter, formatCurrency, formatDate, statusBadge } from './ui.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Store chart instances for cleanup
let revenueChart = null;
let patientChart = null;

function getChartColors() {
    return {
        teal: 'rgba(94,234,212,1)',
        tealFade: 'rgba(94,234,212,.15)',
        blue: 'rgba(0,119,182,1)',
        blueFade: 'rgba(0,119,182,.15)',
        amber: 'rgba(245,158,11,1)',
        amberFade: 'rgba(245,158,11,.15)',
        red: 'rgba(220,38,38,1)',
        redFade: 'rgba(220,38,38,.15)',
        purple: 'rgba(124,58,237,1)',
        purpleFade: 'rgba(124,58,237,.15)',
        grid: 'rgba(255,255,255,.06)',
        text: 'rgba(255,255,255,.5)',
    };
}

function buildRevenueChart(bills) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const c = getChartColors();

    // Group bills by month (last 6 months)
    const months = [];
    const revenues = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push(label);
        const monthBills = bills.filter(b => {
            const bd = new Date(b.date);
            return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
        });
        revenues.push(monthBills.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0));
    }

    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue (₹)',
                data: revenues,
                borderColor: c.teal,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx: cx, chartArea } = chart;
                    if (!chartArea) return c.tealFade;
                    const gradient = cx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(94,234,212,.3)');
                    gradient.addColorStop(1, 'rgba(94,234,212,.02)');
                    return gradient;
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: c.teal,
                pointBorderColor: 'rgba(8,20,35,.8)',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(8,20,35,.9)',
                    borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: 'rgba(255,255,255,.8)',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `₹${ctx.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 } } },
                y: {
                    grid: { color: c.grid },
                    ticks: {
                        color: c.text,
                        font: { size: 11 },
                        callback: v => '₹' + v.toLocaleString()
                    }
                }
            }
        }
    });
}

function buildPatientChart(patients, appointments) {
    const canvas = document.getElementById('patient-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const c = getChartColors();

    // Patient status distribution
    const admitted = patients.filter(p => p.admission_status === 'admitted').length;
    const outpatient = patients.filter(p => p.admission_status === 'outpatient').length;
    const discharged = patients.filter(p => p.admission_status === 'discharged').length;

    if (patientChart) patientChart.destroy();
    patientChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Admitted', 'Outpatient', 'Discharged'],
            datasets: [{
                data: [admitted, outpatient, discharged],
                backgroundColor: [c.blue, c.teal, c.amber],
                borderColor: 'rgba(8,20,35,.6)',
                borderWidth: 3,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255,255,255,.7)',
                        padding: 15,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 10,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(8,20,35,.9)',
                    borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: 'rgba(255,255,255,.8)',
                    padding: 10,
                    cornerRadius: 8,
                }
            }
        }
    });
}

export function updateDashboard() {
    const patients = getPatients();
    const doctors = getDoctors();
    const appointments = getAppointments();
    const bills = getBills();

    // Stat counters
    animateCounter(document.getElementById('total-patients'), patients.length);
    animateCounter(document.getElementById('total-doctors'), doctors.length);
    animateCounter(document.getElementById('total-appointments'), appointments.length);

    const totalRevenue = bills.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    const revenueEl = document.getElementById('total-revenue');
    revenueEl.textContent = formatCurrency(totalRevenue);

    // Build Charts
    buildRevenueChart(bills);
    buildPatientChart(patients, appointments);

    // Recent patients (last 5)
    const recentPatientsEl = document.getElementById('recent-patients-list');
    if (patients.length === 0) {
        recentPatientsEl.innerHTML = '<p class="empty-state">No patients yet</p>';
    } else {
        recentPatientsEl.innerHTML = patients.slice(0, 5).map(p => `
            <div class="list-item">
                <div class="list-item-avatar">${p.name.charAt(0).toUpperCase()}</div>
                <div class="list-item-info">
                    <span class="list-item-title">${p.name}</span>
                    <span class="list-item-sub">${p.patient_id} · ${p.disease}</span>
                </div>
                ${statusBadge(p.admission_status)}
            </div>
        `).join('');
    }

    // Upcoming appointments
    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments
        .filter(a => a.date >= today && a.status === 'scheduled')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

    const upcomingEl = document.getElementById('upcoming-appointments-list');
    if (upcoming.length === 0) {
        upcomingEl.innerHTML = '<p class="empty-state">No upcoming appointments</p>';
    } else {
        upcomingEl.innerHTML = upcoming.map(a => {
            const pName = getPatients().find(p => p.patient_id === a.patient_id)?.name || a.patient_id;
            const dName = getDoctors().find(d => d.doctor_id === a.doctor_id)?.name || a.doctor_id;
            return `<div class="list-item">
                <div class="list-item-avatar appt-avatar"><span class="material-symbols-rounded">event</span></div>
                <div class="list-item-info">
                    <span class="list-item-title">${pName} → Dr. ${dName}</span>
                    <span class="list-item-sub">${formatDate(a.date)}${a.time ? ' at ' + a.time.substring(0,5) : ''}</span>
                </div>
                ${statusBadge(a.status)}
            </div>`;
        }).join('');
    }

    // Pending bills
    const pending = bills.filter(b => b.payment_status === 'pending' || b.payment_status === 'overdue').slice(0, 5);
    const pendingEl = document.getElementById('pending-bills-list');
    if (pending.length === 0) {
        pendingEl.innerHTML = '<p class="empty-state">No pending bills</p>';
    } else {
        pendingEl.innerHTML = pending.map(b => `
            <div class="list-item">
                <div class="list-item-avatar bill-avatar"><span class="material-symbols-rounded">receipt</span></div>
                <div class="list-item-info">
                    <span class="list-item-title">${b.bill_number} · ${b.patient_id}</span>
                    <span class="list-item-sub">${formatDate(b.date)} · ${formatCurrency(b.total)}</span>
                </div>
                ${statusBadge(b.payment_status)}
            </div>
        `).join('');
    }
}
