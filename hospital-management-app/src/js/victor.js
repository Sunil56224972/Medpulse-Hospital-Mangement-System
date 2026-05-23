// =============================================
// Victor — AI Copilot for MedPulse HMS
// =============================================
import { supabase } from './supabase.js';
import { showToast } from './ui.js';
import { loadPatients, getPatients } from './patients.js';
import { loadDoctors, getDoctors } from './doctors.js';
import { loadAppointments } from './appointments.js';
import { loadBills } from './billing.js';
import { loadMedicalRecords } from './medical-history.js';
import { updateDashboard } from './dashboard.js';

// ⚠️ Replace with your Groq API key (get one free at https://console.groq.com)
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let chatHistory = [];
let isProcessing = false;

const SYSTEM_PROMPT = `You are Victor, an AI medical copilot for MedPulse Hospital Management System. You help hospital staff manage patients, doctors, appointments, bills, and medical records.

When the user asks you to ADD/CREATE/REGISTER data, respond ONLY with a valid JSON object (no extra text, no markdown):

For adding a patient:
{"action":"add_patient","data":{"patient_id":"P###","name":"Full Name","age":##,"gender":"M/F/O","disease":"diagnosis","blood_group":"A+/A-/B+/B-/AB+/AB-/O+/O-","phone":"number","email":"email","admission_status":"outpatient/admitted/discharged"}}

For adding a doctor:
{"action":"add_doctor","data":{"doctor_id":"D###","name":"Full Name","age":##,"gender":"M/F/O","specialization":"specialty","phone":"number","email":"email","status":"active"}}

For adding an appointment:
{"action":"add_appointment","data":{"patient_id":"P###","doctor_id":"D###","date":"YYYY-MM-DD","time":"HH:MM","status":"scheduled","notes":"notes"}}

For adding a bill:
{"action":"add_bill","data":{"bill_number":"BILL-XXXXX","patient_id":"P###","date":"YYYY-MM-DD","consultation_fee":0,"test_charges":0,"medication_charges":0,"room_charges":0,"payment_status":"pending/paid","payment_method":"cash/card/upi/insurance"}}

For adding a medical record:
{"action":"add_medical_record","data":{"patient_id":"P###","date":"YYYY-MM-DD","diagnosis":"diagnosis text","prescription":"medication details","doctor_name":"doctor name","record_type":"visit/lab_result/surgery/follow_up/emergency","notes":"notes"}}

RULES:
- Generate realistic patient_id (P001, P002...), doctor_id (D001, D002...), bill_number (BILL-XXXXX)
- Use today's date if not specified: ${new Date().toISOString().split('T')[0]}
- For gender, use M for Male, F for Female, O for Other
- Fill missing fields with reasonable defaults
- If user asks a general question (not adding data), respond with a helpful text answer as: {"action":"chat","message":"your response here"}
- If user asks to search/find/list data, respond as: {"action":"search","table":"patients/doctors/appointments/bills/medical_records","query":"search term"}
- ALWAYS respond with valid JSON only, nothing else`;

async function callGroq(userMessage) {
    chatHistory.push({ role: 'user', content: userMessage });

    // Keep last 10 messages for context
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory.slice(-10)
    ];

    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.3,
            max_tokens: 1024,
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim();
    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
}

function parseResponse(raw) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { action: 'chat', message: raw };
    } catch {
        return { action: 'chat', message: raw };
    }
}

async function executeAction(parsed) {
    switch (parsed.action) {
        case 'add_patient': {
            const d = parsed.data;
            d.age = parseInt(d.age) || 25;
            if (!d.patient_id) d.patient_id = 'P' + String(Date.now()).slice(-3);
            const { error } = await supabase.from('patients').insert([d]);
            if (error) return `❌ Error adding patient: ${error.message}`;
            await loadPatients();
            updateDashboard();
            return `✅ Patient **${d.name}** (${d.patient_id}) added successfully!`;
        }
        case 'add_doctor': {
            const d = parsed.data;
            d.age = parseInt(d.age) || 35;
            if (!d.doctor_id) d.doctor_id = 'D' + String(Date.now()).slice(-3);
            const { error } = await supabase.from('doctors').insert([d]);
            if (error) return `❌ Error adding doctor: ${error.message}`;
            await loadDoctors();
            updateDashboard();
            return `✅ Dr. **${d.name}** (${d.specialization}) added to medical staff!`;
        }
        case 'add_appointment': {
            const d = parsed.data;
            const { error } = await supabase.from('appointments').insert([d]);
            if (error) return `❌ Error booking appointment: ${error.message}`;
            await loadAppointments();
            updateDashboard();
            return `✅ Appointment booked for **${d.patient_id}** with **${d.doctor_id}** on ${d.date}!`;
        }
        case 'add_bill': {
            const d = parsed.data;
            if (!d.bill_number) d.bill_number = 'BILL-' + Date.now().toString(36).toUpperCase();
            d.consultation_fee = parseFloat(d.consultation_fee) || 0;
            d.test_charges = parseFloat(d.test_charges) || 0;
            d.medication_charges = parseFloat(d.medication_charges) || 0;
            d.room_charges = parseFloat(d.room_charges) || 0;
            const { error } = await supabase.from('bills').insert([d]);
            if (error) return `❌ Error generating bill: ${error.message}`;
            await loadBills();
            updateDashboard();
            return `✅ Invoice **${d.bill_number}** generated for ${d.patient_id}!`;
        }
        case 'add_medical_record': {
            const d = parsed.data;
            const { error } = await supabase.from('medical_records').insert([d]);
            if (error) return `❌ Error adding record: ${error.message}`;
            await loadMedicalRecords();
            return `✅ Medical record added for **${d.patient_id}** — ${d.diagnosis}`;
        }
        case 'search': {
            const table = parsed.table || 'patients';
            const q = (parsed.query || '').toLowerCase();
            let results = [];
            if (table === 'patients') {
                results = getPatients().filter(p => p.name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q) || p.disease.toLowerCase().includes(q));
                if (results.length === 0) return `🔍 No patients found matching "${q}"`;
                return `🔍 Found **${results.length}** patient(s):\n` + results.map(p => `• **${p.name}** (${p.patient_id}) — ${p.disease}, ${p.admission_status}`).join('\n');
            }
            if (table === 'doctors') {
                results = getDoctors().filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
                if (results.length === 0) return `🔍 No doctors found matching "${q}"`;
                return `🔍 Found **${results.length}** doctor(s):\n` + results.map(d => `• Dr. **${d.name}** — ${d.specialization}`).join('\n');
            }
            return `🔍 Search completed for "${q}" in ${table}`;
        }
        case 'chat':
            return parsed.message || 'I can help you manage patients, doctors, appointments, bills and medical records. Just tell me what you need!';
        default:
            return parsed.message || "I understood your request. How can I help further?";
    }
}

function renderMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// ========== UI ==========
export function initVictor() {
    const fab = document.getElementById('victor-fab');
    const panel = document.getElementById('victor-panel');
    const closeBtn = document.getElementById('victor-close');
    const input = document.getElementById('victor-input');
    const sendBtn = document.getElementById('victor-send');
    const messages = document.getElementById('victor-messages');

    if (!fab) return;

    // Show FAB only after login (hidden by default in CSS)
    fab.style.display = 'flex';

    // Toggle panel
    fab.addEventListener('click', () => {
        panel.classList.toggle('victor-open');
        fab.classList.toggle('victor-fab-active');
        if (panel.classList.contains('victor-open')) {
            input.focus();
            if (messages.children.length === 0) {
                addMessage('victor', "Hey! I'm **Victor**, your AI copilot 🤖\n\nI can help you:\n• Add patients, doctors, appointments\n• Generate bills & medical records\n• Search your hospital data\n\nJust tell me what you need in plain English!");
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('victor-open');
        fab.classList.remove('victor-fab-active');
    });

    // Send message
    async function sendMessage() {
        const text = input.value.trim();
        if (!text || isProcessing) return;

        input.value = '';
        addMessage('user', text);
        isProcessing = true;

        // Show typing indicator
        const typingId = addTyping();

        try {
            const raw = await callGroq(text);
            const parsed = parseResponse(raw);
            const result = await executeAction(parsed);
            removeTyping(typingId);
            addMessage('victor', result);
        } catch (err) {
            removeTyping(typingId);
            addMessage('victor', `❌ Sorry, I encountered an error: ${err.message}`);
        }
        isProcessing = false;
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `victor-msg victor-msg-${role}`;
        const avatar = role === 'victor'
            ? '<div class="victor-avatar"><img src="/copilot icon.png" class="victor-avatar-img" /></div>'
            : '<div class="victor-avatar victor-avatar-user"><span class="material-symbols-rounded">person</span></div>';
        div.innerHTML = `${avatar}<div class="victor-bubble">${renderMarkdown(text)}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function addTyping() {
        const div = document.createElement('div');
        div.className = 'victor-msg victor-msg-victor victor-typing';
        div.id = 'victor-typing-' + Date.now();
        div.innerHTML = `<div class="victor-avatar"><img src="/copilot icon.png" class="victor-avatar-img" /></div>
            <div class="victor-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div.id;
    }

    function removeTyping(id) {
        document.getElementById(id)?.remove();
    }
}
