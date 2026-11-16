# Deploying Pakiv Employee Verification Portal to Vercel

This repository is pre-configured for a **unified full-stack Vercel deployment**:
- **Frontend** (Static HTML, CSS, Vanilla JS, QR engine) is served via Vercel's global Edge CDN.
- **Backend API** (Express.js, JWT Auth, Mongoose) runs automatically as a Vercel Serverless Function via [`/api/index.js`](file:///d:/Pakiv_Emp/pakiv_emp_verification/api/index.js) and [`vercel.json`](file:///d:/Pakiv_Emp/pakiv_emp_verification/vercel.json).
- **Zero CORS issues:** Both frontend and API are served from the same domain (`employees.pakiv.com`), allowing `HttpOnly` security cookies to work without domain restrictions.

---

## Step 1: Push Repository to GitHub / GitLab / Bitbucket

If you haven't already initialized git:
```bash
git init
git add .
git commit -m "feat: complete Pakiv employee verification portal with Vercel support"
git branch -M main
git remote add origin <your-git-repository-url>
git push -u origin main
```

---

## Step 2: Import into Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/).
2. Click **"Add New..."** > **"Project"**.
3. Select and import your GitHub repository (`pakiv_emp_verification`).
4. In the **Configure Project** screen:
   - **Framework Preset:** Leave as **Other** (do NOT choose a framework, `vercel.json` handles everything).
   - **Root Directory:** `./` (leave default).
   - **Build and Output Settings:** Leave default (no build command needed).

---

## Step 3: Configure Environment Variables in Vercel

In the Vercel project configuration screen, open the **Environment Variables** section and add the following keys:

| Variable | Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `APP_NAME` | `Pakiv Employee Verification Portal` | Application brand name |
| `CLIENT_URL` | `https://employees.pakiv.com` | Primary website domain |
| `PUBLIC_VERIFY_BASE_URL` | `https://employees.pakiv.com/verifyemp` | Public verification URL base |
| `CORS_ORIGINS` | `https://employees.pakiv.com` | Allowed CORS origins |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/pakiv_emp_db?retryWrites=true&w=majority` | **Required:** MongoDB Atlas connection string |
| `JWT_SECRET` | *(64-character random string)* | Secret key for signing admin access tokens |
| `JWT_ACCESS_EXPIRY` | `1h` | Admin session token lifespan |
| `JWT_REFRESH_SECRET` | *(64-character random string)* | Secret key for refresh tokens |
| `JWT_REFRESH_EXPIRY` | `7d` | Admin refresh token lifespan |
| `COOKIE_SECRET` | *(32-character random string)* | Cookie signing secret |
| `R2_ACCOUNT_ID` | `<your-cloudflare-account-id>` | Cloudflare R2 Account ID |
| `R2_ACCESS_KEY_ID` | `<your-r2-access-key-id>` | Cloudflare R2 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | `<your-r2-secret-access-key>` | Cloudflare R2 Secret Access Key |
| `R2_BUCKET_NAME` | `pakiv-employee-assets` | Cloudflare R2 Bucket Name |
| `R2_PUBLIC_URL` | `https://pub-<id>.r2.dev` *(or custom domain)* | Public URL for Cloudflare R2 bucket |
| `DEFAULT_ADMIN_EMAIL` | `admin@pakiv.com` | Initial Super Admin login email |
| `DEFAULT_ADMIN_PASSWORD` | `PakivAdmin2026!Secure` | Initial Super Admin login password (change after login) |
| `DEFAULT_ADMIN_NAME` | `Pakiv Super Admin` | Admin display name |

> [!IMPORTANT]
> **MongoDB Atlas Network Access:**
> Because Vercel serverless functions run across dynamic IP ranges, you must allow access from anywhere in MongoDB Atlas:
> 1. In MongoDB Atlas, go to **Network Access** > **Add IP Address**.
> 2. Select **"Allow Access from Anywhere"** (`0.0.0.0/0`).
> 3. Save changes.

---

## Step 4: Click Deploy

Click **"Deploy"**. Vercel will install the dependencies, configure the static files and serverless API function, and output a deployment URL (e.g. `https://pakiv-employee-verification.vercel.app`).

### What Happens on First Run:
1. When the first request hits the API, the serverless function establishes a cached connection to MongoDB Atlas.
2. It automatically seeds the initial Super Admin (`admin@pakiv.com` / `PakivAdmin2026!Secure`) and the initial sample verified employee records if the database is empty.

---

## Step 5: Attach Custom Domain (`employees.pakiv.com`)

1. In your Vercel Project Dashboard, navigate to **Settings** > **Domains**.
2. Enter `employees.pakiv.com` and click **Add**.
3. In your DNS Provider (e.g. Cloudflare DNS):
   - Add a `CNAME` record:
     - **Name:** `employees`
     - **Target:** `cname.vercel-dns.com`
     - **Proxy Status:** DNS Only (or Proxied with Full SSL)
4. Vercel will automatically provision a free SSL certificate for `employees.pakiv.com`.

---

## Step 6: Test Your Live Deployment

1. **Public Search:** Visit `https://employees.pakiv.com/` and search for `"Faizan"` or `"20251003"`.
2. **Individual Verification Certificate:** Visit `https://employees.pakiv.com/verifyemp?id=20251003`.
   - Verify green checkmark banner.
   - Verify QR code renders on canvas.
   - Click "Print Official Certificate" to verify print preview.
3. **Admin Portal:** Visit `https://employees.pakiv.com/admin/login.html`.
   - Log in using `admin@pakiv.com` and `PakivAdmin2026!Secure`.
   - Test adding a new employee with photo upload.
   - Test generating QR code.
   - Test revoking/restoring an employee record.

---

## Deploying via Vercel CLI (Alternative)

If you prefer deploying from your local terminal using the Vercel CLI:

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Log in to Vercel
vercel login

# 3. Deploy to preview
vercel

# 4. Deploy to production
vercel --prod
```

