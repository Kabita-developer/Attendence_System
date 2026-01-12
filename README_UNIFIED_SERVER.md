# Unified Server Setup

This project now runs both the Next.js frontend and Express backend on a single port (3000).

## Architecture

- **Port 3000**: Runs both Next.js (frontend) and Express (API)
- **Custom Server**: `apps/web/server.js` routes requests:
  - `/api/*` → Express backend
  - Everything else → Next.js frontend
- **Server-Side Rendering**: Full Next.js SSR support

## Development

### First Time Setup

1. Build the API:
   ```bash
   npm run build -w @app/api
   ```

2. Clear Next.js cache (if needed):
   ```powershell
   # Windows PowerShell
   Remove-Item -Recurse -Force apps\web\.next
   ```
   ```bash
   # Linux/Mac
   rm -rf apps/web/.next
   ```

3. Start the unified server:
   ```bash
   npm run dev
   ```
   Or from root:
   ```bash
   npm run dev
   ```

### Troubleshooting

If you see `ERR_CONNECTION_REFUSED :4000`:
1. Check `apps/web/.env.local` - remove any `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` line
2. Clear Next.js cache: `Remove-Item -Recurse -Force apps\web\.next` (PowerShell) or `rm -rf apps/web/.next` (Bash)
3. Restart the dev server

### How It Works

1. The custom server (`apps/web/server.js`) initializes:
   - Database connection
   - Express app (API routes)
   - Next.js app (frontend)

2. Requests are routed:
   - API requests (`/api/*`) → Express
   - Frontend requests → Next.js

3. Both run on port 3000

## Environment Variables

Create `.env` file in project root or `apps/api/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/attendance_system
JWT_ACCESS_SECRET=your-secret-key-min-16-chars
APP_TIMEZONE=Asia/Kolkata
ADMIN_SETUP_KEY=your-admin-setup-key
```

## Production

```bash
npm run build
npm run start
```

## Benefits

- ✅ Single port (3000)
- ✅ Server-side rendering
- ✅ No CORS issues (same origin)
- ✅ Simplified deployment
- ✅ Better performance (no network hop)

