# MedTrack — Medical Records Tracking

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Cloudflare R2

## Cost: $0/month

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Vercel | Forever free | 100 GB bandwidth |
| Neon PostgreSQL | Forever free | 0.5 GB storage |
| Cloudflare R2 | Forever free | 10 GB storage, 0 egress fees |

---

## Setup Guide (Step by Step)

### Step 1 — Neon (Database)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click **New Project**
3. Project name: `medtrack`
4. Region: pick the one closest to you (e.g. `US East (Ohio)`)
5. Click **Create Project**
6. On the dashboard, you'll see a **Connection string**. Copy it.
   It looks like: `postgresql://neondb_owner:abc123@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require`
7. **Save this** — it's your `DATABASE_URL`

### Step 2 — Cloudflare R2 (File Storage)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **R2 Object Storage**
3. Click **Create bucket**
   - Bucket name: `medtrack-uploads`
   - Location: Automatic
   - Click **Create bucket**
4. Now create an API token. Go to **R2 Object Storage** → **Manage R2 API tokens** (top right)
   - Click **Create API token**
   - Token name: `medtrack`
   - Permissions: **Object Read & Write**
   - Specify bucket: select `medtrack-uploads`
   - Click **Create API Token**
5. You'll see three values. **Copy them now — they won't be shown again:**
   - **Access Key ID** → your `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → your `R2_SECRET_ACCESS_KEY`
   - The endpoint URL at the top of the R2 page looks like:
     `https://<account_id>.r2.cloudflarestorage.com`
     → your `R2_ENDPOINT`

   To find your Account ID: it's in the URL when you're on the Cloudflare dashboard:
   `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...`

### Step 3 — Generate Auth Secret

Open a terminal and run:

```bash
openssl rand -base64 32
```

Copy the output. This is your `AUTH_SECRET`.

### Step 4 — Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/medtrack.git
cd medtrack

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Now edit `.env` and fill in the 6 values from the previous steps:

```env
DATABASE_URL="postgresql://neondb_owner:abc123@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="your-32-char-secret-from-openssl"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="medtrack-uploads"
```

Then push the database schema and seed demo data:

```bash
# Create database tables
npx prisma db push

# Seed with demo visits
npm run db:seed

# Start the dev server
npm run dev
```

Open **http://localhost:3000** and login:
- Email: `patient@medtrack.com`
- Password: `password123`

Verify everything works: dashboard loads visits, you can create a visit, upload a file, preview it, delete it.

### Step 5 — Push to GitHub

```bash
git add -A
git commit -m "Configure Neon + Cloudflare R2"
git remote add origin https://github.com/YOUR_USERNAME/medtrack.git
git push -u origin main
```

### Step 6 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `medtrack` repo
3. Framework: it should auto-detect **Next.js**
4. Before clicking Deploy, expand **Environment Variables** and add all 6:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | your 32-char secret |
   | `R2_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
   | `R2_ACCESS_KEY_ID` | your R2 access key |
   | `R2_SECRET_ACCESS_KEY` | your R2 secret key |
   | `R2_BUCKET_NAME` | `medtrack-uploads` |

5. Click **Deploy**
6. Wait 1–2 minutes. Vercel runs `npm install` (which triggers `prisma generate`) then `next build`.
7. Your app is live at `https://medtrack-xxx.vercel.app`

### Step 7 — Seed Production Database

The Neon database is already set up from Step 4 (you ran `prisma db push` and `db:seed` against it locally). If you used a different Neon database for local dev, run the seed against your production DATABASE_URL:

```bash
DATABASE_URL="your-neon-production-url" npx prisma db push
DATABASE_URL="your-neon-production-url" npm run db:seed
```

### Done!

Your app is live. Every `git push` to `main` will auto-deploy to Vercel.

---

## Security

- iron-session encrypted cookies (no raw user IDs exposed)
- Next.js middleware gates every route globally
- Magic byte file validation (PDF/JPG/PNG verified at byte level)
- PATCH input sanitization (only whitelisted fields accepted)
- R2 presigned URLs expire after 1 hour
- Bcrypt password hashing (12 rounds)

## Project Structure

```
src/
├── middleware.ts           Global auth protection
├── lib/
│   ├── prisma.ts          Database client
│   ├── db.ts              All queries (Prisma)
│   ├── auth.ts            Session management (iron-session)
│   └── storage.ts         File storage (Cloudflare R2)
├── app/
│   ├── api/               REST endpoints
│   ├── login/             Login page
│   ├── dashboard/         Visit list + search
│   └── visits/            Create, view, edit visits + files
└── components/            Reusable UI components
```

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npx prisma db push` | Push schema to DB |
| `npm run db:seed` | Seed demo data |
| `npx prisma studio` | Open DB GUI |
