# Attendance & Salary Management System — API Documentation

## Base URL

- **Recommended (web app)**: call **`/api/...`** from the frontend (Next.js rewrite proxies to the backend)
- **Direct backend (dev)**: `http://localhost:4000/api/...`

All endpoints below are shown with the **`/api`** prefix.

---

## Response format

### Success

```json
{ "ok": true, "data": { "...": "..." } }
```

### Error

```json
{ "ok": false, "error": { "message": "Reason", "status": 400 } }
```

---

## Authentication & Sessions

### Cookies

The API uses cookie-based auth:

- **`access_token`** (HTTP-only): short-lived JWT access token
- **`login_token`** (HTTP-only): long-lived persistent token stored in DB (hashed in MongoDB, raw in cookie)
- **`csrf_token`** (NOT HTTP-only): CSRF token for state-changing requests

### Facebook-style persistent login

- After the first successful login, the API issues **`login_token`** and will auto-login on future visits.
- **`POST /api/auth/logout`** clears only the session (`access_token`) but keeps `login_token` (auto-login remains).
- **`POST /api/auth/logout-all`** revokes the persistent token and clears all auth cookies.

### CSRF protection (important)

For any **non-GET** request (POST/PUT/DELETE), send the header (when CSRF is enabled):

- **`x-csrf-token: <value>`**

Where `<value>` must match the `csrf_token` cookie value.

You can bootstrap CSRF with:

- `GET /api/auth/csrf` (sets `csrf_token`)

#### Disable CSRF (dev / Postman)

Set in `apps/api/.env`:

```
CSRF_ENABLED=false
```

---

## Health

### `GET /api/health`

**Response**

```json
{ "ok": true, "status": "up" }
```

---

## Auth

### `GET /api/auth/csrf`

Sets the `csrf_token` cookie.

### `POST /api/auth/admin/signup` (bootstrap only)

Creates the first admin account **only if no admin exists yet**. Protected by `ADMIN_SETUP_KEY`.

**Body**

```json
{
  "email": "admin@example.com",
  "name": "Admin",
  "password": "Admin@12345",
  "setupKey": "change-me-change-me"
}
```

**Notes**
- Requires CSRF header (`x-csrf-token`).
- Use `ADMIN_SETUP_KEY` from `apps/api/.env`.
- After signup, login using `employeeId: "ADMIN"`.

### `POST /api/auth/login`

**Body**

```json
{ "employeeId": "EMP000123", "password": "OTP_OR_PASSWORD" }
```

**Response**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "…",
      "role": "ADMIN",
      "employeeId": "ADMIN",
      "name": "Admin",
      "mustChangePassword": false
    }
  }
}
```

Sets cookies: `access_token`, `login_token`, `csrf_token`.

### `GET /api/auth/me`

Requires authentication (auto-login may happen using `login_token`).

### `POST /api/auth/change-password`

Requires authentication. **Admin only** - employees cannot change their own passwords.

**Body**

```json
{ "currentPassword": "old", "newPassword": "newPasswordMin8Chars" }
```

**Note:** Only admins can change passwords. Employees cannot change their own passwords - only admins can update employee passwords.

### `POST /api/auth/logout`

Clears `access_token` only (keeps `login_token`).

### `POST /api/auth/logout-all`

Revokes `login_token` and clears both `access_token` + `login_token`.

### Admin OTP reset (for admin who forgot password)

#### `POST /api/auth/admin/request-password-reset`

**Body**

```json
{ "email": "admin@example.com" }
```

Always returns `{ requested: true }` (prevents account enumeration).
In **development**, also returns `devOtp`.

#### `POST /api/auth/admin/confirm-password-reset`

**Body**

```json
{ "email": "admin@example.com", "otp": "AB12CD34", "newPassword": "NewPassword123" }
```

Revokes persistent sessions for admin and clears auth cookies.

---

## Slots

### `GET /api/slots`

Requires authentication (ADMIN or EMPLOYEE).

Returns active slots used for automatic salary calculation.

---

## Employee Attendance

### `POST /api/attendance/mark`

Role: **EMPLOYEE**

Rules:
- Only once per day (enforced by unique index `(userId, attendanceDate)`).
- Salary is computed automatically by completed slots at mark time.
- If mark time is later than **slot end + 5 minutes grace**, status becomes **PENDING** and salary is not counted yet.

**Response**

```json
{
  "ok": true,
  "data": {
    "attendance": {
      "id": "…",
      "date": "2026-01-09",
      "time": "2026-01-09T17:05:00.000+05:30",
      "status": "PENDING",
      "proposedSlots": 2,
      "proposedSalary": 400,
      "approvedSlots": 0,
      "approvedSalary": 0,
      "warningMessage": "Late by 2 minute(s). Your attendance is pending admin approval."
    }
  }
}
```

### `GET /api/attendance/me?month=YYYY-MM`

Role: **EMPLOYEE**

Returns attendance rows for the month.

---

## Employee Reports

### `GET /api/reports/me/salary-slip.pdf?month=YYYY-MM`

Role: **EMPLOYEE**

Returns a PDF salary slip (approved attendance only).

---

## Admin — Employees

All admin endpoints require role **ADMIN**.

### `GET /api/admin/employees`

List employees.

### `POST /api/admin/employees`

Creates an employee:
- auto-generates `employeeId`
- all fields (name, email, phone, password) are required
- password is stored in plain text format

**Body** (all fields required)

```json
{ "name": "Employee Name", "email": "employee@example.com", "phone": "+91 98765 43210", "password": "TempPass@123" }
```

**Note:** Password is stored in plain text format in the database.

### `POST /api/admin/employees/:id/update`

Update an employee. All fields are optional.

**Body** (all fields optional)

```json
{ "name": "Updated Name", "email": "updated@example.com", "phone": "+91 99999 99999", "password": "NewPass123", "isActive": true }
```

### `POST /api/admin/employees/:id/delete`

Hard delete an employee. Permanently removes the employee from the database.

---

## Admin — Slots

### `GET /api/admin/slots`

List all slots (active and inactive).

### `POST /api/admin/slots`

Create a slot. Active slots cannot overlap.

**Body**

```json
{ "name": "Morning", "startMinutes": 600, "endMinutes": 720, "salary": 200, "sortOrder": 1, "isActive": true }
```

### `POST /api/admin/slots/:id/update`

Update a slot (also validates overlap rules if active).

---

## Admin — Attendance Review & Editing

### `GET /api/admin/attendance?month=YYYY-MM&employeeId=EMP000123`

Lists attendance rows; if `employeeId` is omitted, returns all employees’ attendance for the month.

### `POST /api/admin/attendance/:id/approve`

Approves an attendance record and recalculates salary based on `attendanceTimeISO` if provided.

**Body**

```json
{ "attendanceTimeISO": "2026-01-09T17:00:00.000+05:30", "adminNote": "optional" }
```

### `POST /api/admin/attendance/:id/reject`

Rejects an attendance record (approved salary becomes 0).

**Body**

```json
{ "adminNote": "optional" }
```

### `POST /api/admin/attendance/upsert`

Create or update a specific day’s attendance for an employee (used by the admin calendar editor).

**Body**

```json
{
  "employeeId": "EMP000123",
  "dateISO": "2026-01-09",
  "attendanceTimeISO": "2026-01-09T12:00:00.000+05:30",
  "status": "APPROVED",
  "adminNote": "optional"
}
```

### `POST /api/admin/attendance/clear`

Clears attendance for a day (employee becomes **ABSENT** for that date). Also deletes salary logs tied to that attendance record.

**Body**

```json
{ "employeeId": "EMP000123", "dateISO": "2026-01-09" }
```

### `POST /api/admin/attendance/delete`

Deletes the attendance record for a day (keeps salary logs for audit trail).

---

## Admin — Reports & Exports

### Daily attendance

- `GET /api/admin/reports/daily?date=YYYY-MM-DD` (JSON)
- `GET /api/admin/reports/daily.pdf?date=YYYY-MM-DD` (PDF)
- `GET /api/admin/reports/daily.xlsx?date=YYYY-MM-DD` (Excel)

### Monthly salary

- `GET /api/admin/reports/monthly-salary?month=YYYY-MM` (JSON)
- `GET /api/admin/reports/monthly-salary.pdf?month=YYYY-MM` (PDF)
- `GET /api/admin/reports/monthly-salary.xlsx?month=YYYY-MM` (Excel)

### Employee summary (month)

- `GET /api/admin/reports/employee-summary?month=YYYY-MM&employeeId=EMP000123` (JSON)
- `GET /api/admin/reports/employee-summary.pdf?month=YYYY-MM&employeeId=EMP000123` (PDF)
- `GET /api/admin/reports/employee-summary.xlsx?month=YYYY-MM&employeeId=EMP000123` (Excel)

---

## Example (browser/SPA)

1) Bootstrap CSRF (once per session):

- `GET /api/auth/csrf`

2) Login:

- `POST /api/auth/login` with JSON body
- Include header `x-csrf-token` equal to `csrf_token` cookie value

3) After login:

- Cookies are sent automatically (HTTP-only cookies)
- Call `GET /api/auth/me` to verify session (or auto-login happens via `login_token`)


