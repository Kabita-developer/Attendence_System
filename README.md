# Attendance & Salary Management System

Monorepo with:
- `apps/api` — Node.js + Express + MongoDB (Mongoose), JWT + HTTP-only cookies, persistent login tokens, PDF/Excel exports
- `apps/web` — Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion + Charts + FullCalendar

## Documentation

- API: `docs/API.md`

## Quick start

1) Install dependencies

```bash
npm install
```

2) Configure env

- Copy `apps/api/env.example` → `apps/api/.env`
- Copy `apps/web/env.local.example` → `apps/web/.env.local`

3) Start dev servers

```bash
npm run dev:api
npm run dev:web
```

4) Seed example data

```bash
npm run seed
```

## Admin OTP password reset (dev)

- Visit `/admin-reset`
- Request OTP using the admin email (from `apps/api/.env` `ADMIN_EMAIL`)
- In development, the API returns `devOtp` so you can complete the flow without email/SMS

## Scripts

- `npm run dev:api` — API dev server
- `npm run dev:web` — Web dev server
- `npm run build` — Builds both apps
- `npm run seed` — Inserts admin, employees, slots, example attendance


