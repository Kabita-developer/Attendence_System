# Frontend API Integration Guide

This document shows how all backend API endpoints are connected to the frontend.

## API Configuration

### Base URL Setup

The frontend uses Next.js rewrites to proxy API requests:

**File:** `apps/web/next.config.ts`
```typescript
async rewrites() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  return [
    {
      source: "/api/:path*",
      destination: `${api}/api/:path*`
    }
  ];
}
```

**Environment Variable:** `apps/web/.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

**Note:** If `NEXT_PUBLIC_API_BASE_URL` is empty, the frontend uses same-origin requests (`/api/*`) which are proxied by Next.js to the backend.

---

## API Client

### Main API Function

**File:** `apps/web/src/lib/api.ts`

```typescript
import { apiFetch } from "@/lib/api";

// All API calls use this function
const result = await apiFetch<ResponseType>("/endpoint", {
  method: "POST", // or GET, PUT, DELETE
  json: { ... } // Request body (optional)
});
```

**Features:**
- Automatically adds `/api` prefix if not present
- Automatically includes JWT token from localStorage in `Authorization: Bearer <token>` header
- Returns typed response: `{ ok: true, data: T } | { ok: false, error: { message: string, status: number } }`

---

## Complete API Endpoints Mapping

### 1. Health Check

**Backend:** `GET /api/health`  
**Frontend Usage:** Not directly used in UI  
**Status:** ✅ Available

**Backend:** `GET /api/health/debug-env`  
**Frontend Usage:** Not directly used in UI (debug endpoint)  
**Status:** ✅ Available

---

### 2. Authentication Endpoints

#### Login
**Backend:** `POST /api/auth/login`  
**Frontend:** `apps/web/src/app/login/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ user: any; token: string }>("/auth/login", {
  method: "POST",
  json: { employeeId, password }
});
// Stores token: setToken(res.data.token)
```

#### Get Current User
**Backend:** `GET /api/auth/me`  
**Frontend:** 
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/components/session-guard.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ user: { role: string; mustChangePassword?: boolean } }>("/auth/me");
```

#### Change Password (Admin Only)
**Backend:** `POST /api/auth/change-password`  
**Frontend:** `apps/web/src/app/change-password/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/auth/change-password", {
  method: "POST",
  json: { currentPassword, newPassword }
});
```

**Note:** Only admins can change passwords. Employees cannot change their own passwords - only admins can update employee passwords via the admin employee management interface.

#### Logout
**Backend:** `POST /api/auth/logout`  
**Frontend:** `apps/web/src/components/logout-button.tsx`  
**Status:** ✅ Connected (token removed from localStorage)

#### Admin Signup
**Backend:** `POST /api/auth/admin/signup`  
**Frontend:** Not used in UI (bootstrap endpoint)  
**Status:** ⚠️ Available but not in UI

#### Admin Password Reset - Request OTP
**Backend:** `POST /api/auth/admin/request-password-reset`  
**Frontend:** `apps/web/src/app/admin-reset/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/auth/admin/request-password-reset", {
  method: "POST",
  json: { email }
});
```

#### Admin Password Reset - Confirm
**Backend:** `POST /api/auth/admin/confirm-password-reset`  
**Frontend:** `apps/web/src/app/admin-reset/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/auth/admin/confirm-password-reset", {
  method: "POST",
  json: { email, otp, newPassword }
});
```

---

### 3. Slots

#### Get Active Slots
**Backend:** `GET /api/slots`  
**Frontend:** Not directly used (admin uses `/admin/slots` instead)  
**Status:** ✅ Available

---

### 4. Employee Attendance

#### Mark Attendance
**Backend:** `POST /api/attendance/mark`  
**Frontend:** `apps/web/src/app/employee/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ attendance: any }>("/attendance/mark", {
  method: "POST",
  json: {}
});
```

#### Get My Attendance (Monthly)
**Backend:** `GET /api/attendance/me?month=YYYY-MM`  
**Frontend:** `apps/web/src/app/employee/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ attendance: AttendanceRow[] }>("/attendance/me?month=" + month);
```

---

### 5. Employee Reports

#### Download Salary Slip (PDF)
**Backend:** `GET /api/reports/me/salary-slip.pdf?month=YYYY-MM`  
**Frontend:** `apps/web/src/app/employee/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(`/reports/me/salary-slip.pdf?month=${month}`, `salary-slip-${month}.pdf`);
```

---

### 6. Admin - Employees

#### List Employees
**Backend:** `GET /api/admin/employees`  
**Frontend:** 
- `apps/web/src/app/admin/employees/page.tsx`
- `apps/web/src/app/admin/attendance/page.tsx`
- `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ employees: Employee[] }>("/admin/employees");
```

#### Create Employee
**Backend:** `POST /api/admin/employees`  
**Frontend:** 
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/employees/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/admin/employees", {
  method: "POST",
  json: { name: name.trim(), email: email.trim(), phone: phone.trim(), password: password.trim() }
});
```

**Note:** All fields (`name`, `email`, `phone`, `password`) are required. Password is stored in plain text format.

#### Update Employee
**Backend:** `POST /api/admin/employees/:id/update`  
**Frontend:** `apps/web/src/app/admin/employees/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/employees/${employeeId}/update`, {
  method: "POST",
  json: { name: "Updated Name", email: "updated@example.com", phone: "+91 99999 99999", password: "NewPass123" }
});
```

**Note:** All fields are optional. Only provided fields will be updated.

#### Delete Employee
**Backend:** `POST /api/admin/employees/:id/delete`  
**Frontend:** `apps/web/src/app/admin/employees/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/employees/${employeeId}/delete`, {
  method: "POST"
});
```

**Note:** This is a hard delete - the employee is permanently removed.

---

### 7. Admin - Slots

#### List All Slots
**Backend:** `GET /api/admin/slots`  
**Frontend:** 
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/slots/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch<{ slots: Slot[] }>("/admin/slots");
```

#### Create Slot
**Backend:** `POST /api/admin/slots`  
**Frontend:** 
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/slots/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/admin/slots", {
  method: "POST",
  json: { name, startMinutes, endMinutes, salary, sortOrder, isActive }
});
```

#### Update Slot
**Backend:** `POST /api/admin/slots/:id/update`  
**Frontend:** `apps/web/src/app/admin/slots/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/slots/${id}`, {
  method: "PUT",
  json: { name, startMinutes, endMinutes, salary, sortOrder, isActive }
});
```

---

### 8. Admin - Attendance

#### List Attendance
**Backend:** `GET /api/admin/attendance?month=YYYY-MM&employeeId=EMP000123`  
**Frontend:** `apps/web/src/app/admin/attendance/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/attendance?month=${month}&employeeId=${employeeId}`);
```

#### Approve Attendance
**Backend:** `POST /api/admin/attendance/:id/approve`  
**Frontend:** `apps/web/src/app/admin/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/attendance/${id}/approve`, {
  method: "POST",
  json: {}
});
```

#### Reject Attendance
**Backend:** `POST /api/admin/attendance/:id/reject`  
**Frontend:** `apps/web/src/app/admin/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/attendance/${id}/reject`, {
  method: "POST",
  json: {}
});
```

#### Upsert Attendance (Create/Update)
**Backend:** `POST /api/admin/attendance/upsert`  
**Frontend:** `apps/web/src/app/admin/attendance/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/admin/attendance/upsert", {
  method: "POST",
  json: { employeeId, dateISO, attendanceTimeISO, status, adminNote }
});
```

#### Clear Attendance
**Backend:** `POST /api/admin/attendance/clear`  
**Frontend:** `apps/web/src/app/admin/attendance/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch("/admin/attendance/clear", {
  method: "POST",
  json: { employeeId, dateISO }
});
```

---

### 9. Admin - Reports

#### Daily Report (JSON)
**Backend:** `GET /api/admin/reports/daily?date=YYYY-MM-DD`  
**Frontend:** Not directly used in UI  
**Status:** ⚠️ Available but not in UI

#### Daily Report (PDF)
**Backend:** `GET /api/admin/reports/daily.pdf?date=YYYY-MM-DD`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(`/admin/reports/daily.pdf?date=${date}`, `daily-attendance-${date}.pdf`);
```

#### Daily Report (Excel)
**Backend:** `GET /api/admin/reports/daily.xlsx?date=YYYY-MM-DD`  
**Frontend:** 
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(`/admin/reports/daily.xlsx?date=${date}`, `daily-attendance-${date}.xlsx`);
```

#### Monthly Salary Report (JSON)
**Backend:** `GET /api/admin/reports/monthly-salary?month=YYYY-MM`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
const res = await apiFetch(`/admin/reports/monthly-salary?month=${month}`);
```

#### Monthly Salary Report (PDF)
**Backend:** `GET /api/admin/reports/monthly-salary.pdf?month=YYYY-MM`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(`/admin/reports/monthly-salary.pdf?month=${month}`, `monthly-salary-${month}.pdf`);
```

#### Monthly Salary Report (Excel)
**Backend:** `GET /api/admin/reports/monthly-salary.xlsx?month=YYYY-MM`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(`/admin/reports/monthly-salary.xlsx?month=${month}`, `monthly-salary-${month}.xlsx`);
```

#### Employee Summary (JSON)
**Backend:** `GET /api/admin/reports/employee-summary?month=YYYY-MM&employeeId=EMP000123`  
**Frontend:** Not directly used in UI  
**Status:** ⚠️ Available but not in UI

#### Employee Summary (PDF)
**Backend:** `GET /api/admin/reports/employee-summary.pdf?month=YYYY-MM&employeeId=EMP000123`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(
  `/admin/reports/employee-summary.pdf?month=${month}&employeeId=${employeeId}`,
  `employee-summary-${employeeId}-${month}.pdf`
);
```

#### Employee Summary (Excel)
**Backend:** `GET /api/admin/reports/employee-summary.xlsx?month=YYYY-MM&employeeId=EMP000123`  
**Frontend:** `apps/web/src/app/admin/reports/page.tsx`  
**Status:** ✅ Connected

```typescript
await downloadFromApi(
  `/admin/reports/employee-summary.xlsx?month=${month}&employeeId=${employeeId}`,
  `employee-summary-${employeeId}-${month}.xlsx`
);
```

---

## Summary

### ✅ Fully Connected Endpoints: 28
- All authentication endpoints
- All employee attendance endpoints
- All employee reports endpoints
- All admin employee management endpoints
- All admin slot management endpoints
- All admin attendance management endpoints
- All admin report export endpoints (PDF/Excel)

### ⚠️ Available but Not in UI: 3
- `GET /api/health` - Health check (not needed in UI)
- `GET /api/health/debug-env` - Debug endpoint (not needed in UI)
- `GET /api/slots` - Public slots (admin uses `/admin/slots` instead)
- `POST /api/auth/admin/signup` - Bootstrap endpoint (one-time use)
- `GET /api/admin/reports/daily` - JSON format (UI uses PDF/Excel)
- `GET /api/admin/reports/employee-summary` - JSON format (UI uses PDF/Excel)

---

## Usage Examples

### Example 1: Login and Store Token
```typescript
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/token";

const res = await apiFetch<{ user: any; token: string }>("/auth/login", {
  method: "POST",
  json: { employeeId: "EMP000123", password: "password123" }
});

if (res.ok) {
  setToken(res.data.token); // Store JWT token
  // Redirect to dashboard
}
```

### Example 2: Authenticated Request
```typescript
import { apiFetch } from "@/lib/api";

// Token is automatically included from localStorage
const res = await apiFetch<{ attendance: any[] }>("/attendance/me?month=2026-01");

if (res.ok) {
  console.log(res.data.attendance);
} else {
  console.error(res.error.message);
}
```

### Example 3: Download File
```typescript
import { downloadFromApi } from "@/lib/download";

// Token is automatically included
await downloadFromApi(
  "/admin/reports/monthly-salary.pdf?month=2026-01",
  "monthly-salary-2026-01.pdf"
);
```

### Example 4: Error Handling
```typescript
const res = await apiFetch("/admin/employees", {
  method: "POST",
  json: { name: "John Doe" }
});

if (!res.ok) {
  if (res.error.status === 401) {
    // Token expired or invalid - redirect to login
    window.location.href = "/login";
  } else {
    // Show error message
    alert(res.error.message);
  }
}
```

---

## Token Management

### Storing Token
```typescript
import { setToken } from "@/lib/token";

// After login
setToken(token);
```

### Getting Token
```typescript
import { getToken } from "@/lib/token";

const token = getToken(); // Returns string | null
```

### Removing Token
```typescript
import { removeToken } from "@/lib/token";

// On logout
removeToken();
```

---

## API Endpoints Reference File

A centralized reference file is available at:
**File:** `apps/web/src/lib/api-endpoints.ts`

This file contains all endpoint paths as constants for type safety and easier maintenance.

---

## Configuration Checklist

- [x] API base URL configured in `next.config.ts`
- [x] Environment variable `NEXT_PUBLIC_API_BASE_URL` set (optional)
- [x] JWT token storage implemented (localStorage)
- [x] Token automatically included in all requests
- [x] Download function includes authentication
- [x] Error handling implemented
- [x] All major endpoints connected to UI

---

## Notes

1. **Same-Origin Requests**: When `NEXT_PUBLIC_API_BASE_URL` is empty, the frontend uses `/api/*` which is proxied by Next.js to `http://localhost:4000/api/*`. This keeps cookies first-party.

2. **Token Storage**: JWT tokens are stored in `localStorage` with key `auth_token`.

3. **Automatic Token Inclusion**: The `apiFetch` function automatically reads the token from localStorage and includes it in the `Authorization: Bearer <token>` header.

4. **Error Handling**: All API calls return `{ ok: boolean, data?: T, error?: { message: string, status: number } }` for consistent error handling.

5. **File Downloads**: The `downloadFromApi` function handles PDF/Excel downloads and automatically includes the JWT token.

