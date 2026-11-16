# Pakiv Employee Verification Portal

Official, enterprise-grade Employee Verification Portal engineered for **Pakiv**.

- **Public Verification Site:** `https://employees.pakiv.com/`
- **Backend API Subdomain:** `https://api-employees.pakiv.com/`
- **Verification Certificate Format:** `https://employees.pakiv.com/verifyemp?id=20251003`
- **Secure Admin Portal:** `https://employees.pakiv.com/admin/login.html`
- **Corporate Registry Office:** Baramulla, Jammu & Kashmir

---

## 1. System Architecture

```text
Pakiv Employee Verification Portal
│
├── frontend/                     # Pure Vanilla Web Architecture (No React/Vue/Angular)
│   ├── index.html                # Public Landing & Debounced Registry Search
│   ├── verifyemp/
│   │   └── index.html            # Individual Verification Certificate with QR & Print
│   ├── admin/
│   │   ├── login.html            # Secure Admin Authentication
│   │   ├── index.html            # Admin Dashboard, Statistics & Activity Stream
│   │   ├── employees.html        # CRUD Directory, Filter, Revocation & QR Actions
│   │   └── employee-form.html    # Add/Edit Form, Auto ID Generator, R2 Photo Uploader
│   ├── css/
│   │   ├── main.css              # Brand Tokens, Typography, Layout & Certificate
│   │   ├── admin.css             # Console Layout, Sidebar, Data Tables & Modals
│   │   └── responsive.css        # Mobile Breakpoints & High-Contrast Print Rules
│   ├── js/
│   │   ├── api.js                # Shared Fetch API Client & Token Management
│   │   ├── public.js             # Live Search Debouncing & Result Cards
│   │   ├── verification.js       # Dynamic Record Verification & Canvas QR Engine
│   │   ├── admin.js              # Auth Guard, CRUD, R2 Uploads, QR Modal, Auditing
│   │   └── qrcode.min.js         # Offline QRCode.js Engine (Davidshimjs)
│   └── assets/
│       ├── pakiv-logo.svg        # Official Pakiv Vector Monogram & Wordmark
│       └── pakiv-logo.png        # High-Resolution Raster Brand Asset
│
├── backend/                      # Modular RESTful Express Architecture
│   ├── src/
│   │   ├── config/               # Database, Cloudflare R2, Environment Tokens
│   │   ├── controllers/          # Public, Auth, Employee, Upload & Audit Logic
│   │   ├── middleware/           # JWT Auth, Rate Limiters, Zod Validation, Error Handlers
│   │   ├── models/               # Mongoose Schemas (Employee, Admin, AuditLog)
│   │   ├── routes/               # Versioned REST Endpoints (/api/v1)
│   │   ├── services/             # Cloudflare R2 Storage (with local fallback), Auditing
│   │   ├── utils/                # Unique ID Generator, Standard Response Envelope
│   │   ├── validators/           # Zod Schema Payloads
│   │   └── app.js                # Express App, Helmet, CORS, Cookie-Parser, Static Host
│   ├── scripts/
│   │   ├── seedAdmin.js          # Super Admin Provisioning Script
│   │   ├── seedEmployees.js      # Sample Verified Records Seeder
│   │   └── generatePngLogo.js    # PNG Asset Generator
│   ├── test/
│   │   └── api.test.js           # Automated Integration Test Suite (13 tests)
│   ├── server.js                 # HTTP Server Entry Point
│   ├── package.json              # Backend Dependencies & Scripts
│   └── .env.example              # Environment Configuration Template
│
├── .gitignore
├── package.json                  # Root Monorepo Helper
└── README.md                     # Comprehensive System Specification
```

---

## 2. Technology Stack

### Frontend
- **Languages:** Semantic HTML5, Modern CSS3, Vanilla ES6+ JavaScript.
- **Frameworks:** None (Zero frontend dependencies like React/Vue/Angular for maximum speed and longevity).
- **Typography:** Google Fonts **Poppins** (`400`, `500`, `600`, `700`, `800`).
- **QR Generation:** Client-side `QRCode.js` rendering to canvas and downloadable PNG.
- **HTTP Client:** Fetch API with automatic `credentials: 'include'` for HttpOnly cookies and Bearer fallback.

### Backend
- **Runtime:** Node.js (v18+) & Express.js.
- **Security:** `helmet` for CSP & HTTP security headers, `express-rate-limit` for DDoS / brute-force mitigation.
- **Authentication:** `jsonwebtoken` (JWT) with HttpOnly, Secure, SameSite cookies & bcrypt password hashing (12 salt rounds).
- **Validation:** `zod` for rigorous payload and parameter validation.
- **Database:** MongoDB Atlas with `mongoose` ODM (with auto-fallback to `mongodb-memory-server` in dev).
- **File Storage:** Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`) with zero exposure of credentials to the client.

### Brand Palette

| Token | Hex Code | Usage |
|---|---|---|
| Primary Teal-Blue | `#35677C` | Core buttons, active links, brand highlights |
| Dark Teal | `#174E63` | Headers, brand wordmark, certificate ribbon |
| Primary Text | `#202B36` | Headings, employee names, primary labels |
| Secondary Text | `#687887` | Subheadings, dates, metadata |
| Page Background | `#F3F6F9` | Neutral, clean background |
| White | `#FFFFFF` | Card surfaces, modals |
| Border | `#E5EBEF` | Subtle dividing lines and borders |
| Success Green | `#18794E` | Verified checkmarks, currently employed badges |
| Warning Amber | `#D97706` | Resigned, contract ended badges |
| Danger Red | `#DC2626` | Revoked credentials, error banners |

---

## 3. Database Schema

### 3.1 Employee Model (`backend/src/models/Employee.js`)

```javascript
{
  employeeId: { type: String, unique: true, required: true, uppercase: true, index: true },
  fullName: { type: String, required: true, trim: true, index: true },
  designation: { type: String, required: true, trim: true, index: true },
  department: { type: String, required: true, trim: true, index: true },
  employmentType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Probationary'],
    default: 'Full-Time'
  },
  joiningDate: { type: Date, required: true },
  contractEndDate: { type: Date, default: null },
  lastWorkingDate: { type: Date, default: null },
  employmentStatus: {
    type: String,
    enum: ['Currently Employed', 'Contract Completed', 'Resigned', 'Contract Ended', 'Record Revoked'],
    default: 'Currently Employed',
    index: true
  },
  profileImage: {
    objectKey: { type: String, default: null },
    url: { type: String, default: null },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: null },
    uploadedAt: { type: Date, default: null }
  },
  verificationNote: { type: String, default: 'Official record issued and verified by Pakiv Management.' },
  isVerified: { type: Boolean, default: true, index: true },
  isRevoked: { type: Boolean, default: false, index: true },
  revocationReason: { type: String, default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: String, default: null },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: String, default: 'System' },
  updatedBy: { type: String, default: 'System' }
}
```

> **Security Guarantee:** The `toPublicJSON()` method sanitizes records before returning to public clients. Internal IDs, soft-delete flags, and private metadata are never exposed publicly.

### 3.2 Admin Model (`backend/src/models/Admin.js`)

```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'], default: 'SUPER_ADMIN' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null }
}
```

### 3.3 Audit Log Model (`backend/src/models/AuditLog.js`)

Tracks all create, update, revoke, restore, delete, and login operations with:
`adminId`, `adminEmail`, `action`, `targetType`, `targetId`, `details`, `ipAddress`, `userAgent`, and `createdAt`.

---

## 4. API Endpoints

All endpoints are versioned under `/api/v1`.

### 4.1 Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status |
| `GET` | `/api/v1/employees/search?q={query}&page=1&limit=10` | Search verified employees (Name, ID, Title) |
| `GET` | `/api/v1/employees/:employeeId/verify` | Retrieve public verification certificate |
| `GET` | `/api/v1/uploads/:objectKey` | Controlled public image delivery |

### 4.2 Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Administrator sign-in (rate-limited) |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Invalidate session & clear cookies |
| `GET` | `/api/v1/auth/me` | Current authenticated admin profile |
| `PATCH` | `/api/v1/auth/me` | Update admin name or change password |

### 4.3 Admin Employee Management (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/employees/stats` | Dashboard metrics (total, employed, resigned, etc.) |
| `GET` | `/api/v1/admin/employees/generate-id` | Generate next sequential unique ID (e.g. `202611001`) |
| `GET` | `/api/v1/admin/employees` | Filter & paginate employee directory |
| `POST` | `/api/v1/admin/employees` | Create new verified employee record |
| `GET` | `/api/v1/admin/employees/:id` | Get employee details by ID or Mongo `_id` |
| `PATCH` | `/api/v1/admin/employees/:id` | Update employee information |
| `PATCH` | `/api/v1/admin/employees/:id/revoke` | Revoke verification credential with reason |
| `PATCH` | `/api/v1/admin/employees/:id/restore` | Restore revoked employee to active status |
| `DELETE` | `/api/v1/admin/employees/:id` | Soft delete employee record |

### 4.4 Admin Asset Uploads (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/admin/uploads/profile-image` | Upload photo to Cloudflare R2 / Storage |
| `DELETE` | `/api/v1/admin/uploads/:objectKey` | Delete photo from storage |

### 4.5 Admin Audit Logs (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/audit-logs` | Retrieve tamper-proof admin activity trail |

---

## 5. Getting Started (Local Development)

### 5.1 Prerequisites
- **Node.js** v18+ (tested on Node v20.20.2)
- **npm** v9+

### 5.2 Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd pakiv_emp_verification
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment:**
   A development `.env` is pre-configured with safe local defaults.
   To customize, edit `backend/.env`.

4. **Seed Database:**
   ```bash
   # Seeds initial Super Admin and 5 sample verification records
   npm run seed:all
   ```

5. **Start the Application:**
   ```bash
   npm start
   ```

6. **Open in Browser:**
   - Public Verification Portal: [http://localhost:5000/](http://localhost:5000/)
   - Sample Certificate: [http://localhost:5000/verifyemp?id=20251003](http://localhost:5000/verifyemp?id=20251003)
   - Admin Login: [http://localhost:5000/admin/login.html](http://localhost:5000/admin/login.html)
     - **Email:** `admin@pakiv.com`
     - **Password:** `PakivAdmin2026!Secure`

7. **Run Automated Test Suite:**
   ```bash
   npm test
   ```
   *(Runs all 13 end-to-end integration tests using Node's native test runner).*

---

## 6. Cloudflare R2 Integration Guide

To connect Cloudflare R2 object storage:

1. Log into your **Cloudflare Dashboard**.
2. Navigate to **R2 Object Storage** > **Create Bucket**.
   - Bucket Name: `pakiv-employee-assets`
3. Click **Manage R2 API Tokens** > **Create API Token**:
   - Permissions: **Object Read & Write**
   - Bucket: Apply to `pakiv-employee-assets`
4. Copy the generated credentials into your `backend/.env`:
   ```env
   R2_ACCOUNT_ID=<your-cloudflare-account-id>
   R2_ACCESS_KEY_ID=<your-access-key-id>
   R2_SECRET_ACCESS_KEY=<your-secret-access-key>
   R2_BUCKET_NAME=pakiv-employee-assets
   R2_PUBLIC_URL=https://pub-<id>.r2.dev   # or custom domain e.g. https://assets.pakiv.com
   ```
5. Restart the server. Images uploaded in the admin portal will now upload directly to Cloudflare R2.

---

## 7. Production Deployment Guide

### Architecture

```text
               Internet Users
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
employees.pakiv.com       api-employees.pakiv.com
 (Cloudflare Pages)        (Node.js / Express Server)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
          MongoDB Atlas                     Cloudflare R2
         (Encrypted DB)                  (Object Photo Store)
```

### 7.1 Frontend Deployment (Cloudflare Pages)
1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **Create Application** > **Pages**.
2. Connect your Git repository.
3. Configure build settings:
   - **Build output directory:** `frontend`
   - **Root directory:** `/`
4. In `frontend/js/api.js`, set `window.PAKIV_API_URL = 'https://api-employees.pakiv.com/api/v1'`.
5. Attach custom domain: `employees.pakiv.com`.

### 7.2 Backend Deployment (Render / Railway / Fly.io / AWS ECS)
1. Deploy the `backend/` directory to your Node.js hosting provider.
2. Configure Environment Variables in the hosting dashboard:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `CLIENT_URL=https://employees.pakiv.com`
   - `PUBLIC_VERIFY_BASE_URL=https://employees.pakiv.com/verifyemp`
   - `CORS_ORIGINS=https://employees.pakiv.com`
   - `MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/pakiv_emp_db?retryWrites=true&w=majority`
   - `JWT_SECRET=<strong-random-secret-string>`
   - `JWT_REFRESH_SECRET=<strong-random-refresh-secret>`
   - `COOKIE_SECRET=<strong-cookie-secret>`
   - `R2_ACCOUNT_ID=<cloudflare-account-id>`
   - `R2_ACCESS_KEY_ID=<cloudflare-access-key-id>`
   - `R2_SECRET_ACCESS_KEY=<cloudflare-secret-key>`
   - `R2_BUCKET_NAME=pakiv-employee-assets`
   - `R2_PUBLIC_URL=https://assets.pakiv.com`
3. Attach custom domain: `api-employees.pakiv.com`.

### 7.3 DNS Configuration

In your DNS manager (e.g., Cloudflare DNS for `pakiv.com`):

| Type | Name | Content / Target | Proxy Status |
|---|---|---|---|
| `CNAME` | `employees` | `<your-pages-project>.pages.dev` | Proxied (Orange Cloud) |
| `CNAME` | `api-employees` | `<your-backend-host>.railway.app` | DNS Only or Proxied |
| `CNAME` | `assets` (optional) | `<bucket-public-url>.r2.dev` | Proxied |

---

## 8. Verification & Security Testing Checklist

- [x] **Poppins Typography:** Loaded across all pages without layout shifts.
- [x] **Brand Palette:** Strictly matches Pakiv teal `#35677C`, `#174E63`, and `#F3F6F9`.
- [x] **Debounced Search:** Querying by name, ID, or designation works smoothly with instant updates.
- [x] **Unique Verification URL:** `/verifyemp?id=20251003` loads verified employee certificate.
- [x] **Invalid Record Handling:** Unknown ID displays official "Employee Record Not Found" notice.
- [x] **Revoked Record Banner:** Revoked credential clearly displays prominent red revoked alert banner.
- [x] **High-Contrast Print Output:** Hides unnecessary page elements and prints certificate formatted for A4/Letter or PDF save.
- [x] **Automatic QR Code Generation:** Points directly to canonical verification URL, previews in modal, downloads as PNG.
- [x] **Admin Authentication:** bcrypt (12 rounds), JWT tokens, HttpOnly/Secure cookies, rate limiting (10 attempts per 15 min).
- [x] **Employee CRUD:** Add, view, edit, update status, soft-delete, and revoke with reason.
- [x] **Auto ID Generator:** Suggests unique sequential ID `YYYYMMXXX` checking database records.
- [x] **Photo Storage:** Validates MIME type & size (<5MB), uploads to Cloudflare R2 with local fallback.
- [x] **Audit Trail:** All administrative operations are logged with timestamps and IP addresses.
- [x] **Automated Tests:** 13/13 passing unit and integration tests.

