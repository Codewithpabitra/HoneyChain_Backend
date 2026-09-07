# HoneyChain

Blockchain-based honey traceability and smart beekeeping management system — built for Smart India Hackathon 2026 (Problem Statement 26021, Ministry of MSME).

HoneyChain connects the hive to the consumer through IoT-powered smart beekeeping, AI-driven insights, blockchain-backed traceability, and QR-based product verification — giving rural beekeepers authenticity, transparency, and better market access.

## Repo Structure

This is a monorepo containing three parts:
honeychain/
├── backend/ # Node + Express + TypeScript API
├── frontend/ # Next.js web app
└── mobile/ # React Native / Expo app

Each folder maintains its own setup, docs, and dependencies.

## Getting Started

- Backend setup → [`backend/docs/SETUP.md`](./backend/docs/SETUP.md)
- Frontend setup → [`frontend/docs/SETUP.md`](./frontend/docs/SETUP.md)

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | TypeScript, Node, Express, MongoDB/Mongoose, Redis, JWT + Google OAuth |
| Frontend | Next.js, TypeScript, Tailwind CSS, Framer Motion |
| AI/ML | Hive health scoring, disease/stress risk, yield prediction (separate service) |
| Blockchain | Permissioned ledger for tamper-evident supply-chain events |
| Hardware | ESP32 sensor nodes (temp, humidity, weight, vibration) |

## Team

- Backend & Frontend — [@Codewithpabitra](https://github.com/Codewithpabitra)
- Blockchain, ML, Hardware — teammates

## Contributing

See [`backend/docs/CONTRIBUTING.md`](./backend/docs/CONTRIBUTING.md) for branch naming and commit conventions used across the whole repo.

## License

TBD