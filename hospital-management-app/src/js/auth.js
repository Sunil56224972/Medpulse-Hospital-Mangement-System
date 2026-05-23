// =============================================
// Authentication Module — Role-Based
// =============================================
import { supabase } from './supabase.js';
import { showToast } from './ui.js';

let currentRole = 'admin';
let currentProfile = null;

export function getUserRole() { return currentRole; }
export function getUserProfile() { return currentProfile; }

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const profile = await fetchProfile(user.id);
        if (profile) {
            currentRole = profile.role;
            currentProfile = profile;
        }
    }
    return user;
}

async function fetchProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return data;
}

export async function signIn(email, password, role) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check profile role matches
    const profile = await fetchProfile(data.user.id);
    if (!profile) {
        throw new Error('No profile found. Please sign up first.');
    }
    if (profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error(`This account is registered as "${profile.role}". Please select the correct role.`);
    }
    currentRole = profile.role;
    currentProfile = profile;
    return data.user;
}

export async function signUp(email, password, role) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Create profile with role
    if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
            user_id: data.user.id,
            email: email,
            role: role,
            full_name: email.split('@')[0],
            created_at: new Date().toISOString()
        }]);
        if (profileError) console.error('Profile creation error:', profileError);
    }
    return data;
}

export async function signOut() {
    currentRole = 'admin';
    currentProfile = null;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

function getSelectedRole(selectorId) {
    const active = document.querySelector(`#${selectorId} .role-btn.active`);
    return active ? active.dataset.role : 'admin';
}

export function initAuthListeners(onLogin, onLogout) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupToggle = document.getElementById('signup-toggle-btn');
    const backToLogin = document.getElementById('back-to-login-btn');

    // Role selector toggle
    document.querySelectorAll('.role-selector').forEach(selector => {
        selector.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selector.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const role = getSelectedRole('login-role-selector');
        const errorDiv = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        errorDiv.style.display = 'none';
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline-block';
        btn.disabled = true;

        try {
            const user = await signIn(email, password, role);
            showToast(`Welcome back! Logged in as ${role}`, 'success');
            onLogin(user);
        } catch (err) {
            errorDiv.textContent = err.message || 'Invalid credentials';
            errorDiv.style.display = 'block';
        } finally {
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    });

    // Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const role = getSelectedRole('signup-role-selector');
        const errorDiv = document.getElementById('signup-error');
        const successDiv = document.getElementById('signup-success');
        const btn = document.getElementById('signup-btn');

        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline-block';
        btn.disabled = true;

        try {
            await signUp(email, password, role);
            successDiv.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} account created! Check your email to confirm, then sign in.`;
            successDiv.style.display = 'block';
            showToast(`${role} account created successfully!`, 'success');
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        } finally {
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    });

    // Toggle signup/login
    signupToggle.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupToggle.style.display = 'none';
        document.querySelector('.login-divider').style.display = 'none';
        document.querySelector('#login-role-selector').style.display = 'none';
        signupForm.style.display = 'block';
        document.querySelector('.login-card-header h3').textContent = 'Create Account';
        document.querySelector('.login-card-header p').textContent = 'Register a new account';
    });

    backToLogin.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        signupToggle.style.display = 'block';
        document.querySelector('.login-divider').style.display = 'flex';
        document.querySelector('#login-role-selector').style.display = 'flex';
        document.querySelector('.login-card-header h3').textContent = 'Welcome Back';
        document.querySelector('.login-card-header p').textContent = 'Sign in to your dashboard';
    });

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('.material-symbols-rounded');
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
            }
        });
    });

    // Logout — all portals
    ['logout-btn', 'doctor-logout-btn', 'patient-logout-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', async () => {
                await signOut();
                showToast('Signed out successfully', 'info');
                onLogout();
            });
        }
    });

    // Auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') onLogout();
    });
}
