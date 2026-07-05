# InstaSched Pro - Enterprise Instagram Auto-Posting SaaS

This directory contains the production-ready Next.js 15 App Router application code and architecture, integrated with Prisma, PostgreSQL, and the separate Python scheduling service.

## Tech Stack
- **Web Frontend/API**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database ORM**: Prisma with PostgreSQL
- **Background Daemon**: Python 3.11 with `requests` and `psycopg2`
- **Isolation/Deploy**: Docker & Docker Compose

## Core Architecture Design
```
       ┌──────────────────────┐
       │ Next.js 15 App       │ ◀──── Web Client (Dashboard, Composer)
       │ (Port 3000)          │
       └──────────────────────┘
                  │ (Writes database)
                  ▼
       ┌──────────────────────┐
       │ PostgreSQL DB        │
       │ (Port 5432)          │
       └──────────────────────┘
                  ▲
                  │ (Checks database every 30 seconds for due posts)
       ┌──────────────────────┐
       │ Python Scheduler     │ ───► Instagram Graph API
       │ Service (Daemon)     │      (SSL Container Handshake & Publish)
       └──────────────────────┘
```

## Setup Instructions

### 1. Environment Variables Configuration
Create a `.env` file in the root directory:
```env
# Next.js Server Secrets
DATABASE_URL="postgresql://postgres:secure_postgres_pass@postgres-db:5432/instasched?schema=public"
NEXTAUTH_SECRET="your_nextauth_secure_signing_secret"

# Secure Access Token Encryption Key (AES-256 Fernet)
# Generate one using cryptography: Fernet.generate_key().decode()
ENCRYPTION_KEY="your_fernet_256bit_aes_encryption_key_here"

# Instagram Graph API App Details
INSTAGRAM_APP_ID="your_facebook_developer_app_id"
INSTAGRAM_APP_SECRET="your_facebook_developer_app_secret"
INSTAGRAM_REDIRECT_URI="https://yourdomain.com/api/auth/callback/instagram"
```

### 2. Local Database & Migrations
Install Node dependencies and synchronize PostgreSQL schemas with Prisma:
```bash
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Docker Compose Deployment (Recommended)
Launch the entire localized stack (PostgreSQL + Next.js App + Python Scheduler) with a single command:
```bash
docker-compose up --build -d
```
The application will boot and expose port `3000` for public web traffic, while PostgreSQL runs securely in an isolated container network, and the Python daemon automatically ticks in the background.

## Feature Implementation Audit

### Secure OAuth Connectivity
Unlike unsafe bots, **InstaSched Pro never collects or stores Instagram user passwords**. It links using official Facebook Login for Business flow, which retrieves a secure OAuth access token. The token is encrypted inside PostgreSQL via AES-256 GCM/Fernet before being saved.

### Exponential Backoff Retry System
The background Python scheduler manages transient Instagram server errors (Rate limits 429, Internal server errors 500/503) by backing off exponentially:
$$\text{delay} = \text{BASE\_BACKOFF} \times 2^{\text{attempt}}$$
This safeguards your developer account reputation and prevents account bans.

---
InstaSched.Pro is ready for production scaling.
