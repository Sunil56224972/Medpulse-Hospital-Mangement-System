import { getCurrentUser, initAuthListeners, getUserRole } from './auth.js';
import { initUIListeners } from './ui.js';
import { loadPatients, initPatientsRealtime, openAddPatientModal, filterPatients } from './patients.js';
import { loadDoctors, initDoctorsRealtime, openAddDoctorModal, filterDoctors } from './doctors.js';
import { loadAppointments, initAppointmentsRealtime, openAddAppointmentModal, filterAppointments } from './appointments.js';
import { loadBills, initBillsRealtime, openAddBillModal, filterBills } from './billing.js';
import { loadMedicalRecords, initMedicalRecordsRealtime, openAddRecordModal, filterRecords } from './medical-history.js';
import { updateDashboard } from './dashboard.js';
import { initVictor } from './victor.js';
import { initDoctorPortal } from './doctor-portal.js';
import { initPatientPortal } from './patient-portal.js';

const pageTitles = {
    dashboard: ['Dashboard', 'Hospital Overview'],
    patients: ['Patients', 'Patient registration & records'],
    doctors: ['Doctors', 'Medical staff directory'],
    appointments: ['Appointments', 'Scheduling & consultations'],
    billing: ['Billing', 'Invoices & payment tracking'],
    'medical-history': ['Medical History', 'Patient diagnosis & prescriptions'],
};

function hideAllPages() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('doctor-portal').style.display = 'none';
    document.getElementById('patient-portal').style.display = 'none';
}

function showLogin() {
    hideAllPages();
    document.getElementById('login-page').style.display = 'flex';
}

function switchSection(section) {
    document.querySelectorAll('#app-page .content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#app-page .nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(`section-${section}`);
    if (el) { el.classList.add('active'); el.style.animation = 'fadeSlideIn 0.4s ease'; }
    const nav = document.querySelector(`#app-page .nav-item[data-section="${section}"]`);
    if (nav) nav.classList.add('active');
    const [title, sub] = pageTitles[section] || ['Dashboard', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = sub;
    if (section === 'dashboard') updateDashboard();
}

async function initAdminApp(user) {
    hideAllPages();
    document.getElementById('app-page').style.display = 'flex';
    document.getElementById('user-email-display').textContent = user.email;

    // Add role badge to admin
    const badge = document.querySelector('#app-page .role-badge');
    if (!badge) {
        const userBadge = document.querySelector('#app-page .user-badge');
        if (userBadge) {
            const span = document.createElement('span');
            span.className = 'role-badge role-admin';
            span.textContent = 'Admin';
            userBadge.appendChild(span);
        }
    }

    await Promise.all([loadPatients(), loadDoctors()]);
    await Promise.all([loadAppointments(), loadBills()]);
    await loadMedicalRecords();
    updateDashboard();

    initPatientsRealtime(updateDashboard);
    initDoctorsRealtime(updateDashboard);
    initAppointmentsRealtime(updateDashboard);
    initBillsRealtime(updateDashboard);
    initMedicalRecordsRealtime(updateDashboard);

    initVictor();
}

async function initDoctorApp(user) {
    hideAllPages();
    document.getElementById('doctor-portal').style.display = 'flex';
    await initDoctorPortal();
}

async function initPatientApp(user) {
    hideAllPages();
    document.getElementById('patient-portal').style.display = 'flex';
    await initPatientPortal();
}

async function initApp(user) {
    const role = getUserRole();
    switch (role) {
        case 'doctor': await initDoctorApp(user); break;
        case 'patient': await initPatientApp(user); break;
        default: await initAdminApp(user); break;
    }
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
    initUIListeners();

    // Admin navigation
    document.querySelectorAll('#app-page .nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
            if (window.innerWidth < 1024) document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Add buttons
    document.getElementById('add-patient-btn').addEventListener('click', openAddPatientModal);
    document.getElementById('add-doctor-btn').addEventListener('click', openAddDoctorModal);
    document.getElementById('add-appointment-btn').addEventListener('click', openAddAppointmentModal);
    document.getElementById('add-bill-btn').addEventListener('click', openAddBillModal);
    document.getElementById('add-record-btn').addEventListener('click', openAddRecordModal);

    // Search inputs
    document.getElementById('patient-search').addEventListener('input', e => filterPatients(e.target.value));
    document.getElementById('doctor-search').addEventListener('input', e => filterDoctors(e.target.value));
    document.getElementById('appointment-search').addEventListener('input', e => filterAppointments(e.target.value));
    document.getElementById('bill-search').addEventListener('input', e => filterBills(e.target.value));
    document.getElementById('record-search').addEventListener('input', e => filterRecords(e.target.value));

    // Auth
    initAuthListeners(
        (user) => initApp(user),
        () => { showLogin(); location.reload(); }
    );

    // Check existing session
    const user = await getCurrentUser();

    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        preloader.classList.add('preloader-hide');
        setTimeout(() => { preloader.style.display = 'none'; }, 600);

        // BYPASS LOGIN: Force app initialization as admin
        initApp({ email: 'admin@medpulse.com' });
    }, 4000);

    // ============ PREMIUM ANIMATIONS ============

    // 1. 3D Tilt Effect on stat cards & dashboard cards
    function initTiltEffect() {
        const cards = document.querySelectorAll('.stat-card, .card');
        cards.forEach(card => {
            card.style.willChange = 'transform';
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;
                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
                card.style.transition = 'transform .5s cubic-bezier(.25,.46,.45,.94)';
            });
            card.addEventListener('mouseenter', () => {
                card.style.transition = 'transform .1s ease-out';
            });
        });
    }

    // 2. Ripple Effect on clickable elements
    function initRippleEffect() {
        const clickables = document.querySelectorAll('.nav-item, .btn-primary, .btn-outline, .stat-card');
        clickables.forEach(el => {
            el.style.position = 'relative';
            el.style.overflow = 'hidden';
            el.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,.15);width:${size}px;height:${size}px;left:${x}px;top:${y}px;transform:scale(0);animation:rippleAnim .6s ease-out forwards;pointer-events:none;z-index:1`;
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 700);
            });
        });
        // Inject ripple keyframe
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = '@keyframes rippleAnim{0%{transform:scale(0);opacity:1}100%{transform:scale(2.5);opacity:0}}';
            document.head.appendChild(style);
        }
    }

    // 4. Hover Glow on list items
    function initListGlow() {
        document.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.boxShadow = '0 0 15px rgba(94,234,212,.08)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.boxShadow = 'none';
            });
        });
    }

    // 5. Initialize all animations after DOM is ready
    setTimeout(() => {
        initTiltEffect();
        initRippleEffect();
        initListGlow();
    }, 5000);
});
