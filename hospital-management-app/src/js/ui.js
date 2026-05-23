// =============================================
// UI Helpers — Modal, Toast, Utilities
// =============================================

// ---- Toast Notifications ----
let toastCounter = 0;

export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = `toast-${++toastCounter}`;

    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    toast.innerHTML = `
        <span class="material-symbols-rounded toast-icon">${icons[type] || 'info'}</span>
        <span class="toast-msg">${message}</span>
        <button class="toast-close" aria-label="Close">
            <span class="material-symbols-rounded">close</span>
        </button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 500);
}

// ---- Modal ----
export function openModal(title, bodyHTML, onSubmit) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    overlay.style.display = 'flex';

    requestAnimationFrame(() => {
        overlay.classList.add('modal-visible');
        modal.classList.add('modal-animate-in');
    });

    // Attach form submit
    const form = bodyEl.querySelector('form');
    if (form && onSubmit) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="btn-loader"></span> Saving...';
            }
            try {
                await onSubmit(new FormData(form));
                closeModal();
            } catch (err) {
                showToast(err.message || 'An error occurred', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="material-symbols-rounded">save</span> Save';
                }
            }
        });
    }
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    overlay.classList.remove('modal-visible');
    modal.classList.remove('modal-animate-in');
    setTimeout(() => {
        overlay.style.display = 'none';
        document.getElementById('modal-body').innerHTML = '';
    }, 300);
}

// ---- Status Badge ----
export function statusBadge(status) {
    const colors = {
        active: 'badge-green', on_leave: 'badge-yellow', inactive: 'badge-red',
        admitted: 'badge-blue', outpatient: 'badge-teal', discharged: 'badge-gray',
        scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', no_show: 'badge-yellow',
        paid: 'badge-green', pending: 'badge-yellow', partial: 'badge-orange', overdue: 'badge-red',
    };
    return `<span class="badge ${colors[status] || 'badge-gray'}">${status?.replace('_', ' ') || 'N/A'}</span>`;
}

// ---- Format Currency ----
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

// ---- Format Date ----
export function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- Animate Counter ----
export function animateCounter(element, target, duration = 800) {
    const start = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
    if (start === target) return;
    const startTime = performance.now();
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        element.textContent = current.toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ---- Init modal close handlers ----
export function initUIListeners() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}
