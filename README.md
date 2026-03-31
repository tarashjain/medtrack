# MedTrack — Medical Records Tracking

A production-ready medical records management app.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Azure Blob Storage

## Cost Breakdown

| Service | Free Tier | When You'd Pay |
|---------|-----------|----------------|
| **Vercel** (hosting) | 100GB bandwidth, serverless functions | >100GB bandwidth/month |
| **Neon** (PostgreSQL) | 0.5GB storage, autosuspend | >0.5GB data |
| **Azure Blob Storage** | 5GB for 12 months (free account) | ~$0.02/GB/month after |
| **Total** | **$0/month** for personal use | Scales with usage |

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free)
- An [Azure](https://portal.azure.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free)

---

## Setup Guide

### 1. Neon PostgreSQL (2 minutes)

1. Go to [neon.tech](https://neon.tech) → Sign up → **Create Project**
2. Name it `medtrack`, pick the region closest to you
3. Copy the connection string — it looks like:
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. That's your `DATABASE_URL`

### 2. Azure Blob Storage (5 minutes)

1. Go to [Azure Portal](https://portal.azure.com) → **Create a resource** → **Storage account**
2. Settings:
   - **Name:** `medtrackfiles` (must be globally unique, lowercase)
   - **Region:** same as your Neon region if possible
   - **Performance:** Standard
   - **Redundancy:** LRS (cheapest)
3. After creation, go to the storage account → **Containers** → **+ Container**
   - Name: `medtrack-uploads`
   - Access level: **Private**
4. Go to **Access keys** (left sidebar under Security) → Copy:
   - **Storage account name** → `AZURE_STORAGE_ACCOUNT_NAME`
   - **Key** (key1) → `AZURE_STORAGE_ACCOUNT_KEY`

### 3. Local Development

```bash
# Clone and install
git clone <your-repo> && cd medtrack
npm install

# Configure environment
cp .env.example .env
# Fill in the 5 values from steps 1 & 2, plus generate AUTH_SECRET:
openssl rand -base64 32

# Push database schema
npx prisma db push

# Seed demo data
npm run db:seed

# Start
npm run dev
```

Open **http://localhost:3000** → login with `patient@medtrack.com` / `password123`

### 4. Deploy to Vercel (3 minutes)

```bash
# Push to GitHub
git init && git add . && git commit -m "initial"
gh repo create medtrack --private --push
```

1. Go to [vercel.com](https://vercel.com) → **Import Project** → Select your repo
2. Add environment variables (Settings → Environment Variables):
   ```
   DATABASE_URL            = (from Neon)
   AUTH_SECRET             = (from openssl rand -base64 32)
   AZURE_STORAGE_ACCOUNT_NAME = (from Azure)
   AZURE_STORAGE_ACCOUNT_KEY  = (from Azure)
   AZURE_STORAGE_CONTAINER    = medtrack-uploads
   ```
3. Deploy. Done.

Vercel auto-runs `prisma generate` via the `postinstall` script. On first deploy, you'll need to run the migration manually:

```bash
# One-time: push schema to Neon from your local machine
DATABASE_URL="your-neon-url" npx prisma db push
DATABASE_URL="your-neon-url" npm run db:seed
```

---

## Security Features

- **Encrypted sessions** — iron-session AES-encrypts the cookie; no user ID visible to client
- **Global middleware** — `src/middleware.ts` gates every route before handlers execute
- **Magic byte validation** — uploaded files verified at the byte level (not just MIME header)
- **Input sanitization** — PATCH only accepts whitelisted fields
- **SAS presigned URLs** — files served via time-limited Azure SAS tokens (1hr expiry)
- **Bcrypt** — 12 rounds for password hashing

## Project Structure

```
src/
├── middleware.ts              Global auth gate
├── app/
│   ├── api/auth/              Login, logout, current user
│   ├── api/visits/            CRUD visits + file upload/delete
│   ├── login/                 Login page
│   ├── dashboard/             Visit cards with search
│   └── visits/
│       ├── new/               Create visit form
│       └── [id]/              Visit detail + file management
├── components/
│   ├── ui/                    Toast, ConfirmModal, FilePreviewModal, Skeletons
│   ├── Navbar.tsx             Sidebar + mobile nav
│   ├── FileUpload.tsx         Drag & drop with validation
│   └── FileList.tsx           File list with inline preview
├── lib/
│   ├── prisma.ts              Prisma client singleton
│   ├── db.ts                  All database queries
│   ├── auth.ts                iron-session management
│   └── storage.ts             Azure Blob upload/SAS/delete
└── prisma/
    ├── schema.prisma          PostgreSQL schema
    └── seed.ts                Demo data
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:migrate` | Create + apply migration |

## Upgrading Later

When you outgrow free tiers:
- **Database:** Neon paid ($19/mo) or Azure Database for PostgreSQL Flexible Server
- **Hosting:** Vercel Pro ($20/mo) or Azure Static Web Apps / App Service
- **Storage:** Azure Blob scales automatically, just keep paying per-GB
