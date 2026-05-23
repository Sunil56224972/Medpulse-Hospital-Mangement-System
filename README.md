<div align="center">

# 🏥 MedPulse — Hospital Management System

### A Modern, AI-Powered Hospital Management Platform

[![Live](https://img.shields.io/badge/Status-Live-00a896?style=for-the-badge&logo=vercel)](https://github.com/Sunil56224972/Medpulse-Hospital-Mangement-System)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br>

<img src="hospital-management-app/Screenshots/login page background image.jpg" alt="MedPulse Banner" width="700" style="border-radius: 12px;" />

<br>

**MedPulse HMS** is a full-featured, real-time hospital management system built with a premium glassmorphism UI. It features role-based access for Admins, Doctors, and Patients — powered by **Supabase** for backend and **Victor AI Copilot** for natural language database operations.

<br>

[🚀 Getting Started](#-getting-started) · [✨ Features](#-features) · [🏗️ Architecture](#️-architecture) · [🤖 Victor AI](#-victor-ai-copilot) · [📸 Screenshots](#-screenshots) · [🛠️ Tech Stack](#️-tech-stack)

</div>

---

## ✨ Features

### 🔐 Role-Based Access Control
| Role | Portal | Capabilities |
|------|--------|-------------|
| **👨‍💼 Admin** | Full Dashboard | Manage all patients, doctors, appointments, billing, medical records, analytics |
| **👨‍⚕️ Doctor** | Doctor Portal | View own appointments, patients, today's schedule, medical records |
| **🧑‍🦱 Patient** | Patient Portal | View own appointments, medical records, bills, pending payments |

### 📋 Core Modules
- **Patient Management** — Full CRUD with admission tracking, blood groups, disease info
- **Doctor Management** — Specialization tracking, availability status, contact info
- **Appointment Scheduling** — Date/time booking with status tracking (Scheduled → Completed/Cancelled)
- **Billing & Invoicing** — Itemized bills with consultation, test, medication, room charges + **PDF invoice download**
- **Medical Records** — 5 record types: Visit, Lab Result, Surgery, Follow-up, Emergency

### 📊 Analytics Dashboard
- **Revenue Line Chart** — Last 6 months trend with gradient fill
- **Patient Distribution** — Doughnut chart (Admitted / Outpatient / Discharged)
- **Animated Stat Cards** — Real-time counters with custom icons
- **Recent Activity** — Latest patients, upcoming appointments, pending bills

### ⚡ Real-Time Updates
All data syncs instantly across all connected users via **Supabase Realtime** — no manual refresh needed.

### 🤖 Victor AI Copilot
An AI-powered assistant that can perform database operations via **natural language**. See the [Victor AI section](#-victor-ai-copilot) for details.

### 🎨 Premium UI/UX
- **Glassmorphism Design** — Frosted glass cards with backdrop blur
- **3D Tilt Effects** — Interactive hover animations on cards
- **Ripple Click Effects** — Material-style feedback on interactions
- **EKG Heartbeat Preloader** — Medical-themed animated loading screen
- **Responsive Layout** — Works on desktop, tablet, and mobile

---

## 🏗️ Architecture

```
hospital-management-app/
├── index.html                    # Single-page application shell (590 lines)
├── package.json                  # Dependencies & scripts
├── create-profiles-table.sql     # Database schema for auth profiles
│
├── public/                       # Static assets
│   ├── logo.png                  # MedPulse brand logo
│   ├── login-bg.jpg              # Login page background
│   ├── favicon.svg               # Browser tab icon
│   └── icons.svg                 # SVG icon sprites
│
├── icons/                        # Custom stat card icons
│   ├── Registered Patients.png
│   ├── Medical Staff.png
│   ├── Appointments.png
│   └── Total Revenue.png
│
├── src/
│   ├── css/
│   │   └── styles.css            # Complete design system (484 lines)
│   │
│   └── js/
│       ├── supabase.js           # Supabase client initialization
│       ├── auth.js               # Authentication & role management
│       ├── main.js               # App bootstrap & routing
│       ├── ui.js                 # Toasts, modals, formatters
│       ├── dashboard.js          # Charts & analytics
│       ├── patients.js           # Patient CRUD + real-time
│       ├── doctors.js            # Doctor CRUD + real-time
│       ├── appointments.js       # Appointment scheduling
│       ├── billing.js            # Billing + PDF generation
│       ├── medical-history.js    # Medical records management
│       ├── doctor-portal.js      # Doctor-specific dashboard
│       ├── patient-portal.js     # Patient-specific dashboard
│       └── victor.js             # AI Copilot (Groq LLaMA 3.3)
│
└── Screenshots/                  # UI screenshots
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Admin   │  │  Doctor  │  │ Patient  │  │ Victor AI  │  │
│  │ Dashboard│  │  Portal  │  │  Portal  │  │  Copilot   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │             │              │         │
│  ┌────┴──────────────┴─────────────┴──────────────┘         │
│  │        main.js (Router) + auth.js (Guard)                │
│  └────────────────────────┬─────────────────────────────────│
└───────────────────────────┼─────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌────────────┐
     │   Supabase   │ │ Supabase │ │    Groq    │
     │  PostgreSQL  │ │   Auth   │ │  LLaMA 3.3 │
     │  + Realtime  │ │          │ │  (70B AI)  │
     └──────────────┘ └──────────┘ └────────────┘
```

---

## 🤖 Victor AI Copilot

Victor is an AI assistant integrated into the app that understands natural language and performs hospital operations automatically.

### What Victor Can Do

| Command Example | Action |
|----------------|--------|
| *"Add patient Rahul, age 28, flu"* | Creates a new patient record |
| *"Schedule appointment for P-101 with Dr. Sharma tomorrow at 10am"* | Books an appointment |
| *"Generate bill for patient P-101, consultation 500, tests 200"* | Creates an itemized bill |
| *"Add Dr. Priya, cardiologist, age 35"* | Registers a new doctor |
| *"Show all pending appointments"* | Searches and displays data |
| *"What are the symptoms of diabetes?"* | Answers general medical questions |

### How It Works
1. User types a message in natural language
2. Victor sends it to **Groq API** (LLaMA 3.3 70B model)
3. The AI parses intent and returns a structured JSON action
4. The app executes the action (insert/query) on **Supabase**
5. Victor confirms the result with a friendly message

### Supported Actions
`add_patient` · `add_doctor` · `add_appointment` · `add_bill` · `add_medical_record` · `search_data` · `general_response`

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla JavaScript (ES Modules) | Application logic |
| **Markup** | HTML5 | Semantic page structure |
| **Styling** | CSS3 (Custom Properties) | Glassmorphism design system |
| **Build** | Vite 8 | Dev server & bundling |
| **Backend** | Supabase (PostgreSQL) | Database, Auth, Realtime |
| **AI** | Groq API (LLaMA 3.3 70B) | Natural language processing |
| **Charts** | Chart.js 4 | Revenue & patient analytics |
| **PDF** | jsPDF 4 | Invoice PDF generation |
| **Animation** | GSAP 3 | Premium micro-animations |
| **Icons** | Google Material Symbols | UI iconography |
| **Font** | Inter (Google Fonts) | Typography |

---

## 🗄️ Database Schema

| Table | Primary Key | Description |
|-------|------------|-------------|
| `profiles` | `id (UUID)` | Auth user profiles with role (admin/doctor/patient) |
| `patients` | `patient_id` | Patient demographics, disease, blood group, admission status |
| `doctors` | `doctor_id` | Doctor info, specialization, availability status |
| `appointments` | `id (UUID)` | Scheduling with patient-doctor linking, date/time, status |
| `bills` | `id (UUID)` | Itemized invoicing — consultation, test, medication, room charges |
| `medical_records` | `id (UUID)` | Visit/lab/surgery/follow-up/emergency records |

### Key Relationships
- **Profiles ↔ Patients/Doctors** — Linked by matching `email` for portal access
- **Patients → Appointments** — One-to-many via `patient_id`
- **Doctors → Appointments** — One-to-many via `doctor_id`
- **Patients → Bills** — One-to-many via `patient_id`
- **Patients → Medical Records** — One-to-many via `patient_id`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **Supabase** account (free tier works)
- **Groq** API key (for Victor AI — free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/Sunil56224972/Medpulse-Hospital-Mangement-System.git
cd Medpulse-Hospital-Mangement-System/hospital-management-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL from `create-profiles-table.sql` in the SQL Editor
3. Create the following tables in your Supabase dashboard:

   - `patients` — columns: `patient_id`, `name`, `age`, `gender`, `disease`, `blood_group`, `phone`, `email`, `admission_status`, `created_at`
   - `doctors` — columns: `doctor_id`, `name`, `age`, `gender`, `specialization`, `phone`, `email`, `status`, `created_at`
   - `appointments` — columns: `id`, `patient_id`, `doctor_id`, `date`, `time`, `status`, `notes`
   - `bills` — columns: `id`, `bill_number`, `patient_id`, `date`, `consultation_fee`, `test_charges`, `medication_charges`, `room_charges`, `total`, `payment_status`, `payment_method`, `created_at`
   - `medical_records` — columns: `id`, `patient_id`, `date`, `record_type`, `diagnosis`, `prescription`, `doctor_name`, `notes`

4. Update `src/js/supabase.js` with your project URL and anon key

### 4. Set Up Victor AI (Optional)

1. Get a free API key from [console.groq.com](https://console.groq.com)
2. Update the `GROQ_API_KEY` in `src/js/victor.js`

### 5. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:5173** in your browser.

### 6. Create Your First Account

1. Select a role (Admin / Doctor / Patient)
2. Click "Create Account" to switch to signup
3. Enter your details and sign up
4. You'll be redirected to the appropriate portal

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#0077b6` | Brand blue — buttons, links, accents |
| `--accent` | `#00a896` | Teal — highlights, active states |
| `--bg` | `#f0f4f8` | Base background |
| Glass Effect | `rgba(255,255,255,.08)` + `blur(20px)` | Cards, sidebar, topbar |
| Font | Inter 300-900 | All typography |
| Border Radius | 10px / 8px / 6px | Cards / inputs / badges |
| Breakpoints | 1280 / 1024 / 768 / 480px | Responsive design |

---

## 📱 Responsive Design

| Device | Breakpoint | Adaptations |
|--------|-----------|-------------|
| **Desktop** | > 1280px | 4-column stats, 3-column dashboard grid |
| **Laptop** | ≤ 1280px | 2-column stats, 2-column dashboard |
| **Tablet** | ≤ 1024px | Collapsible sidebar, stacked login layout |
| **Mobile** | ≤ 768px | Single column, full-width search, stacked forms |
| **Small Mobile** | ≤ 480px | Single column stats, compact cards |

---

## 🔒 Authentication Flow

```
User selects role → Enter credentials → Supabase Auth
                                            │
                                    ┌───────┴───────┐
                                    │  Check        │
                                    │  profiles     │
                                    │  table role   │
                                    └───────┬───────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                   role=admin          role=doctor          role=patient
                        │                   │                   │
                   Admin Dashboard    Doctor Portal      Patient Portal
                   (Full Access)      (Own Data Only)    (Own Data Only)
```

---

## 📸 Screenshots

> **Login Page** — Glassmorphism card with animated background and role selector

> **Admin Dashboard** — Real-time stats, charts, recent activity panels

> **Billing** — Itemized invoicing with PDF download capability

> **Victor AI** — Natural language copilot for hands-free operations

---

## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Sunil56224972">
        <b>Sunil</b>
      </a>
      <br />
      <sub>Full Stack Developer</sub>
    </td>
  </tr>
</table>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using Supabase, Vite & Groq AI**

⭐ Star this repo if you found it useful!

</div>
