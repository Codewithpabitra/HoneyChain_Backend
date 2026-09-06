# HoneyChain Backend — Setup Guide

## Prerequisites
- Node.js (v18+ recommended)
- npm
- MongoDB Atlas connection string (or local MongoDB instance)
- Git

## Tech Stack
- **Language:** TypeScript (v7, NodeNext module resolution)
- **Runtime for dev:** `tsx` (not `ts-node` — TS7's new compiler isn't yet
  compatible with ts-node's internal API usage)
- **Process watcher:** `nodemon`
- **Framework:** Express
- **Database:** MongoDB + Mongoose
  (planned migration to PostgreSQL/Neon + Prisma if we advance past
  the internal hackathon round)
- **Cache/Rate limiting:** Redis (added only for QR-scan anomaly
  detection + rate limiting — not used as a general cache)
- **Auth:** JWT + Google OAuth (one-tap/one-time login)
- **Code review:** CodeRabbit (auto-reviews every PR)

## Getting Started

1. Clone the repo
   \`\`\`bash
   git clone https://github.com/Codewithpabitra/HoneyChain_Backend.git honeychain-backend

   cd honeychain-backend
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Copy environment variables
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Fill in real values for `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc.

4. Run in dev mode
   \`\`\`bash
   npm run dev
   \`\`\`
   Server starts on `http://localhost:5000` by default (or whatever `PORT` you set).

5. Confirm it's working
   \`\`\`bash
   curl http://localhost:5000
   \`\`\`
   Should return: `{ "success": true, "message": "HoneyChain backend is running 🐝" }`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts dev server via nodemon + tsx, auto-restarts on file change |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled production build |

## Project Structure
See main README / repo tree — key folders:
- `src/config` — env loading, DB connection
- `src/models` — Mongoose schemas
- `src/middlewares` — error handling, auth, rate limiting, validation
- `src/controllers`, `src/routes`, `src/services` — request handling logic
- `src/utils` — shared helpers (AppError, logger)
- `docs/` — this file, API docs, schema docs, contributing guide

## Git Workflow
See `docs/CONTRIBUTING.md` for branch naming and commit conventions.