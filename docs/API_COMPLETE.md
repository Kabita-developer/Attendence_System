# Attendance & Salary Management System — Complete API Documentation

## Base URL

- **Recommended (web app)**: Call `/api/...` from the frontend (Next.js rewrite proxies to the backend)
- **Direct backend (dev)**: `http://localhost:4000/api/...`

All endpoints below are shown with the `/api` prefix.

---

## Response Format

### Success Response
```typescript
{
  ok: true;
  data: T; // T varies by endpoint
}
```

### Error Response
```typescript
{
  ok: false;
  error: {
    message: string;
    status: number;
  };
}
```

---

## Authentication & Sessions

### JWT Token-Based Authentication

The API uses JWT (JSON Web Token) tokens for authentication:

- **JWT Token**: Short-lived access token (15 minutes default)
- Tokens are sent in the `Authorization` header as `Bearer <token>`
- Tokens are stateless and do not require server-side session storage
- Client stores tokens in localStorage (or similar) and includes them in requests

### Authentication Flow

1. **Login**: Send credentials to `/api/auth/login` and receive a JWT token in the response
2. **Store Token**: Save the token in localStorage (or similar client-side storage)
3. **Include Token**: Send token in `Authorization: Bearer <token>` header for all authenticated requests
4. **Logout**: Remove token from client-side storage (no server call needed)

### Token Format

All authenticated requests must include:
```
Authorization: Bearer <jwt_token>
```

---

## Type Definitions

```typescript
// User Types
type UserRole = "ADMIN" | "EMPLOYEE";
type AttendanceStatus = "APPROVED" | "PENDING" | "REJECTED";

// User
interface User {
  id: string;
  role: UserRole;
  employeeId: string;
  name: string;
  email?: string;
  mustChangePassword?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

// Slot
interface Slot {
  id: string;
  name: string;
  startMinutes: number; // 0-1439 (minutes since midnight)
  endMinutes: number; // 1-1440 (minutes since midnight)
  salary: number;
  isActive?: boolean;
  sortOrder?: number;
}

// Attendance
interface Attendance {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  time: string; // ISO 8601 datetime
  status: AttendanceStatus;
  proposedSlots: number;
  proposedSalary: number;
  approvedSlots: number;
  approvedSalary: number;
  lateByMinutes?: number;
  warningMessage?: string;
}

// Employee
interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

// Daily Report Row
interface DailyReportRow {
  employeeId: string;
  name: string;
  status: AttendanceStatus | "ABSENT";
  time: string; // HH:mm format
  approvedSalary: number;
}

// Monthly Salary Row
interface MonthlySalaryRow {
  employeeId: string;
  name: string;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
  totalSalary: number;
}

// Employee Summary Day
interface EmployeeSummaryDay {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus | "ABSENT";
  time: string; // HH:mm format
  proposedSalary: number;
  approvedSalary: number;
  warningMessage: string;
}
```

---

## Health

### `GET /api/health`

Check API health status.

**Authentication:** None

**Request:** None

**Response (200):**
```typescript
{
  ok: true;
  status: "up";
}
```

---

## Authentication Endpoints

### `POST /api/auth/admin/signup`

Creates the first admin account **only if no admin exists yet**. Protected by `ADMIN_SETUP_KEY`.

**Authentication:** None (but requires `ADMIN_SETUP_KEY`)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  email: string; // Valid email
  name?: string; // 1-120 characters, optional
  password: string; // 8-128 characters
  setupKey: string; // Must match ADMIN_SETUP_KEY from .env
}
```

**Example:**
```json
{
  "email": "admin@example.com",
  "name": "Admin",
  "password": "Admin@12345",
  "setupKey": "change-me-change-me"
}
```

**Response (201):**
```typescript
{
  ok: true;
  data: {
    admin: {
      id: string;
      role: "ADMIN";
      employeeId: "ADMIN";
      name: string;
      email: string;
    };
  };
}
```

**Error Responses:**
- **403**: Invalid `setupKey` or `ADMIN_SETUP_KEY` not configured
- **409**: Admin already exists

**Notes:**
- After signup, login using `employeeId: "ADMIN"` (not email)

---

### `POST /api/auth/login`

Login with employee ID and password.

**Authentication:** None

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  employeeId: string; // Minimum 3 characters
  password: string; // Minimum 1 character
}
```

**Example:**
```json
{
  "employeeId": "EMP000123",
  "password": "OTP_OR_PASSWORD"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    user: {
      id: string;
      role: UserRole;
      employeeId: string;
      name: string;
      mustChangePassword: boolean;
    };
    token: string; // JWT token to use for authenticated requests
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "role": "EMPLOYEE",
      "employeeId": "EMP000123",
      "name": "John Doe",
      "mustChangePassword": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- **401**: Invalid credentials or user inactive

**Notes:**
- Store the `token` in localStorage (or similar) and include it in `Authorization: Bearer <token>` header for all authenticated requests

---

### `GET /api/auth/me`

Get current authenticated user information.

**Authentication:** Required (JWT token in Authorization header)

**Request:** None

**Response (200):**
```typescript
{
  ok: true;
  data: {
    user: {
      id: string;
      role: UserRole;
      employeeId: string;
      name: string;
      mustChangePassword: boolean;
    };
  };
}
```

**Error Responses:**
- **401**: Not authenticated
- **404**: User not found

---

### `POST /api/auth/change-password`

Change password for authenticated admin user. **Only admins can change passwords - employees cannot change their own passwords.**

**Authentication:** Required (ADMIN role only)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  currentPassword: string; // Minimum 1 character
  newPassword: string; // 8-128 characters
}
```

**Example:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPasswordMin8Chars"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    changed: true;
  };
}
```

**Error Responses:**
- **400**: Invalid current password
- **401**: Not authenticated
- **403**: Forbidden (only admins can change passwords)
- **404**: User not found

**Notes:**
- Only users with ADMIN role can use this endpoint
- Employees cannot change their own passwords - only admins can update employee passwords via the admin employee update endpoint
- Password is stored in plain text format

---

### `POST /api/auth/logout`

Logout endpoint (JWT tokens are stateless, so logout is handled client-side by removing the token).

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** None (or empty JSON `{}`)

**Response (200):**
```typescript
{
  ok: true;
  data: {
    loggedOut: true;
  };
}
```

**Notes:**
- JWT tokens are stateless, so logout is primarily handled client-side by removing the token from storage
- This endpoint is provided for consistency but the token should be removed from localStorage on the client

---

### `POST /api/auth/admin/request-password-reset`

Request OTP for admin password reset.

**Authentication:** None

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  email: string; // Valid email
}
```

**Example:**
```json
{
  "email": "admin@example.com"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    requested: true;
    devOtp?: string; // Only in development mode (NODE_ENV !== "production")
  };
}
```

**Notes:**
- Always returns `{ requested: true }` to prevent account enumeration
- In development, also returns `devOtp` so you can complete the flow without email/SMS
- OTP expires in 10 minutes

---

### `POST /api/auth/admin/confirm-password-reset`

Confirm password reset with OTP.

**Authentication:** None

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  email: string; // Valid email
  otp: string; // Minimum 4 characters
  newPassword: string; // 8-128 characters
}
```

**Example:**
```json
{
  "email": "admin@example.com",
  "otp": "AB12CD34",
  "newPassword": "NewPassword123"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    reset: true;
  };
}
```

**Error Responses:**
- **400**: Invalid OTP or OTP expired

**Notes:**
- After password reset, user must login again with new password

---

## Slots

### `GET /api/slots`

Get all active slots used for automatic salary calculation.

**Authentication:** Required (ADMIN or EMPLOYEE)

**Request:** None

**Response (200):**
```typescript
{
  ok: true;
  data: {
    slots: Array<{
      id: string;
      name: string;
      startMinutes: number;
      endMinutes: number;
      salary: number;
    }>;
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "slots": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Morning",
        "startMinutes": 600,
        "endMinutes": 720,
        "salary": 200
      }
    ]
  }
}
```

---

## Employee Attendance

### `POST /api/attendance/mark`

Mark attendance for the current day. Only once per day (enforced by unique index).

**Authentication:** Required (EMPLOYEE role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:** None (or empty JSON `{}`)

**Response (201):**
```typescript
{
  ok: true;
  data: {
    attendance: {
      id: string;
      date: string; // YYYY-MM-DD
      time: string; // ISO 8601 datetime
      status: AttendanceStatus;
      proposedSlots: number;
      proposedSalary: number;
      approvedSlots: number;
      approvedSalary: number;
      warningMessage: string;
    };
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "attendance": {
      "id": "507f1f77bcf86cd799439011",
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

**Error Responses:**
- **409**: Attendance already marked for today

**Business Logic:**
- Salary is computed automatically by completed slots at mark time
- If mark time is later than **slot end + 5 minutes grace**, status becomes **PENDING** and salary is not counted yet
- If on time, status is **APPROVED** and salary is automatically logged

---

### `GET /api/attendance/me`

Get attendance records for the authenticated employee for a specific month.

**Authentication:** Required (EMPLOYEE role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format (e.g., "2026-01")
}
```

**Example:** `GET /api/attendance/me?month=2026-01`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    month: string; // YYYY-MM
    attendance: Array<{
      id: string;
      date: string; // YYYY-MM-DD
      time: string; // ISO 8601 datetime
      status: AttendanceStatus;
      proposedSlots: number;
      proposedSalary: number;
      approvedSlots: number;
      approvedSalary: number;
      warningMessage: string;
    }>;
  };
}
```

---

## Employee Reports

### `GET /api/reports/me/salary-slip.pdf`

Get PDF salary slip for authenticated employee (approved attendance only).

**Authentication:** Required (EMPLOYEE role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
}
```

**Example:** `GET /api/reports/me/salary-slip.pdf?month=2026-01`

**Response (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="salary-slip-{employeeId}-{month}.pdf"`
- **Body:** PDF binary data

---

## Admin — Employees

All admin endpoints require **ADMIN** role.

### `GET /api/admin/employees`

List all employees.

**Authentication:** Required (ADMIN role)

**Request:** None

**Response (200):**
```typescript
{
  ok: true;
  data: {
    employees: Array<{
      id: string;
      employeeId: string;
      name: string;
      email: string;
      phone: string;
      password: string; // Password in plain text format
      isActive: boolean;
      mustChangePassword: boolean;
      createdAt: string; // ISO 8601 datetime
    }>;
  };
}
```

---

### `POST /api/admin/employees`

Create a new employee. Auto-generates `employeeId` and generates a one-time password (OTP).

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  name: string; // 1-120 characters (required)
  email: string; // Valid email (required)
  phone: string; // Phone number, 5-30 characters (required)
  password: string; // 1-128 characters (required). Stored in plain text format in the database.
}
```

**Example:**
```json
{
  "name": "Employee Name",
  "email": "employee@example.com",
  "phone": "+91 98765 43210",
  "password": "TempPass@123"
}
```

**Response (201):**
```typescript
{
  ok: true;
  data: {
    employee: {
      id: string;
      employeeId: string; // Auto-generated (e.g., "EMP000123")
      name: string;
      email: string;
      phone: string;
    };
    oneTimePassword: string; // Initial password/OTP for first login (e.g., "AB12C")
  };
}
```

**Notes:**
- Auto-generates `employeeId` (format: `EMP{6-digit-number}`)
- All fields (`name`, `email`, `phone`, `password`) are required
- Password is stored in plain text format in the database
- Sets `mustChangePassword=false`

---

### `POST /api/admin/employees/:id/update`

Update an employee. All fields are optional - only provided fields will be updated.

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `id`: string (employee ID)

**Request Body:**
```typescript
{
  name?: string; // 1-120 characters, optional
  email?: string; // Valid email, optional
  phone?: string; // Phone number, 5-30 characters, optional
  password?: string; // 1-128 characters, optional. Stored in plain text format.
  isActive?: boolean; // Optional
}
```

**Example:** `POST /api/admin/employees/507f1f77bcf86cd799439011/update`

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+91 99999 99999",
  "password": "NewPassword123"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    employee: {
      id: string;
      employeeId: string;
      name: string;
      email: string;
      phone: string;
    };
  };
}
```

**Error Responses:**
- **404**: Employee not found

**Notes:**
- Only provided fields will be updated
- If `password` is updated, `passwordUpdatedAt` is automatically set to current date
- Password is stored in plain text format

---

### `POST /api/admin/employees/:id/delete`

Hard delete an employee. This permanently removes the employee from the database.

**Authentication:** Required (ADMIN role)

**Path Parameters:**
- `id`: string (employee ID)

**Example:** `POST /api/admin/employees/507f1f77bcf86cd799439011/delete`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    deleted: true;
  };
}
```

**Error Responses:**
- **404**: Employee not found

**Notes:**
- This is a hard delete - the employee record is permanently removed
- Associated attendance records may still exist (depending on your data retention policy)

---

## Admin — Slots

### `GET /api/admin/slots`

List all slots (active and inactive).

**Authentication:** Required (ADMIN role)

**Request:** None

**Response (200):**
```typescript
{
  ok: true;
  data: {
    slots: Array<{
      id: string;
      name: string;
      startMinutes: number; // 0-1439
      endMinutes: number; // 1-1440
      salary: number;
      isActive: boolean;
      sortOrder: number;
    }>;
  };
}
```

---

### `POST /api/admin/slots`

Create a new slot. Active slots cannot overlap.

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  name: string; // 1-80 characters
  startTime?: string; // Time string, e.g., "01:00 PM" or "13:00" (preferred)
  endTime?: string; // Time string, e.g., "04:00 PM" or "16:00" (preferred)
  startMinutes?: number | string; // Integer 0-1439 OR time string (for backward compatibility)
  endMinutes?: number | string; // Integer 1-1440 OR time string (for backward compatibility)
  salary: number; // Minimum 0
  sortOrder?: number; // Integer, optional, default 0
  isActive?: boolean; // Optional, default true
}
```

**Time Format:**
- 12-hour format: `"01:00 PM"`, `"1:00 PM"`, `"12:00 AM"`, `"11:59 PM"`
- 24-hour format: `"13:00"`, `"01:00"`, `"00:00"`, `"23:59"`
- Seconds are optional: `"01:00:00 PM"` or `"13:00:00"`

***Examples:**

Using minutes (backward compatible):
```json
{
  "name": "Morning",
  "startMinutes": 600,
  "endMinutes": 720,
  "salary": 200,
  "sortOrder": 1,
  "isActive": true
}
```

**Response (201):**
```typescript
{
  ok: true;
  data: {
    slot: {
      id: string;
    };
  };
}
```

**Error Responses:**
- **400**: `endMinutes` must be > `startMinutes`
- **409**: Slot overlaps an existing active slot

**Validation:**
- `endMinutes` must be greater than `startMinutes`
- Active slots cannot overlap with other active slots

---

### `POST /api/admin/slots/:id/update`

Update a slot. Also validates overlap rules if active.

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  name?: string; // 1-80 characters, optional
  startTime?: string; // Time string, e.g., "01:00 PM" or "13:00" (preferred)
  endTime?: string; // Time string, e.g., "04:00 PM" or "16:00" (preferred)
  startMinutes?: number | string; // Integer 0-1439 OR time string, optional
  endMinutes?: number | string; // Integer 1-1440 OR time string, optional
  salary?: number; // Minimum 0, optional
  sortOrder?: number; // Integer, optional
  isActive?: boolean; // Optional
}
```

**Time Format:**
- 12-hour format: `"01:00 PM"`, `"1:00 PM"`, `"12:00 AM"`, `"11:59 PM"`
- 24-hour format: `"13:00"`, `"01:00"`, `"00:00"`, `"23:59"`
- Seconds are optional: `"01:00:00 PM"` or `"13:00:00"`

**Path Parameters:**
- `id`: string (slot ID)

**Example:** `POST /api/admin/slots/507f1f77bcf86cd799439011/update`

Using time strings (recommended):
```json
{
  "startTime": "02:00 PM",
  "endTime": "05:00 PM",
  "salary": 250
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    updated: true;
  };
}
```

**Error Responses:**
- **400**: End time must be after start time
- **404**: Slot not found
- **409**: Slot overlaps an existing active slot

---

### `POST /api/admin/slots/:id/delete`

Hard delete a slot. This permanently removes the slot from the database.

**Authentication:** Required (ADMIN role)

**Path Parameters:**
- `id`: string (slot ID)

**Example:** `POST /api/admin/slots/507f1f77bcf86cd799439011/delete`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    deleted: true;
  };
}
```

**Error Responses:**
- **404**: Slot not found

---

## Admin — Attendance Review & Editing

### `GET /api/admin/attendance`

List attendance records. If `employeeId` is omitted, returns all employees' attendance for the month.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format (required)
  employeeId?: string; // Optional, filter by employee
}
```

**Example:** `GET /api/admin/attendance?month=2026-01&employeeId=EMP000123`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    month: string; // YYYY-MM
    attendance: Array<{
      id: string;
      userId: string;
      date: string; // YYYY-MM-DD
      time: string; // ISO 8601 datetime
      status: AttendanceStatus;
      proposedSlots: number;
      proposedSalary: number;
      approvedSlots: number;
      approvedSalary: number;
      warningMessage: string;
      lateByMinutes: number;
    }>;
  };
}
```

**Notes:**
- If `employeeId` is provided but not found, returns empty array (not 404)

---

### `POST /api/admin/attendance/:id/approve`

Approve an attendance record and recalculate salary based on `attendanceTimeISO` if provided.

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  attendanceTimeISO?: string; // ISO 8601 datetime, optional (recalculates salary)
  adminNote?: string; // Maximum 500 characters, optional
}
```

**Path Parameters:**
- `id`: string (attendance ID)

**Example:** `POST /api/admin/attendance/507f1f77bcf86cd799439011/approve`

**Example Request:**
```json
{
  "attendanceTimeISO": "2026-01-09T17:00:00.000+05:30",
  "adminNote": "Approved with time adjustment"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    approved: true;
  };
}
```

**Error Responses:**
- **404**: Attendance not found

**Business Logic:**
- If `attendanceTimeISO` is provided, recalculates salary based on new time
- Creates salary log entry with action `ADMIN_APPROVED` or `ADMIN_MODIFIED`
- Sets `reviewedBy` and `reviewedAt` fields

---

### `POST /api/admin/attendance/:id/reject`

Reject an attendance record (approved salary becomes 0).

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  adminNote?: string; // Maximum 500 characters, optional
}
```

**Path Parameters:**
- `id`: string (attendance ID)

**Example:** `POST /api/admin/attendance/507f1f77bcf86cd799439011/reject`

**Example Request:**
```json
{
  "adminNote": "Rejected due to late arrival"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    rejected: true;
  };
}
```

**Error Responses:**
- **404**: Attendance not found

**Business Logic:**
- Sets status to `REJECTED`
- Sets `approvedSlots` and `approvedSalary` to 0
- Sets `reviewedBy` and `reviewedAt` fields

---

### `POST /api/admin/attendance/upsert`

Create or update a specific day's attendance for an employee (used by the admin calendar editor).

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  employeeId: string; // Minimum 3 characters
  dateISO: string; // YYYY-MM-DD format
  attendanceTimeISO?: string; // ISO 8601 datetime, optional (defaults to noon if not provided)
  status: AttendanceStatus; // "APPROVED" | "PENDING" | "REJECTED"
  adminNote?: string; // Maximum 500 characters, optional
}
```

**Example:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2026-01-09",
  "attendanceTimeISO": "2026-01-09T12:00:00.000+05:30",
  "status": "APPROVED",
  "adminNote": "Manual entry"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    id: string; // Attendance record ID
  };
}
```

**Error Responses:**
- **404**: Employee not found

**Business Logic:**
- Creates or updates attendance record
- Recalculates salary based on `attendanceTimeISO` (or default noon)
- If status is `APPROVED`, creates salary log entry with action `ADMIN_MODIFIED`
- Sets `reviewedBy` and `reviewedAt` fields

---

### `POST /api/admin/attendance/clear`

Clear attendance for a day (employee becomes **ABSENT** for that date). Also deletes salary logs tied to that attendance record.

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  employeeId: string; // Minimum 3 characters
  dateISO: string; // YYYY-MM-DD format
}
```

**Example:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2026-01-09"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    cleared: true;
  };
}
```

**Error Responses:**
- **404**: Employee not found

**Database:**
- Deletes attendance record
- Deletes associated salary logs

---

### `POST /api/admin/attendance/delete`

Delete the attendance record for a day (keeps salary logs for audit trail).

**Authentication:** Required (ADMIN role)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  employeeId: string; // Minimum 3 characters
  dateISO: string; // YYYY-MM-DD format
}
```

**Example:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2026-01-09"
}
```

**Response (200):**
```typescript
{
  ok: true;
  data: {
    deleted: boolean; // true if record was deleted, false if not found
  };
}
```

**Error Responses:**
- **404**: Employee not found

**Notes:**
- Does NOT delete salary logs (keeps audit trail)
- Admin can re-approve which creates a new log

---

## Admin — Reports & Exports

### Daily Attendance Report

#### `GET /api/admin/reports/daily`

Get daily attendance report as JSON.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  date: string; // YYYY-MM-DD format
}
```

**Example:** `GET /api/admin/reports/daily?date=2026-01-09`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    date: string; // YYYY-MM-DD
    rows: Array<DailyReportRow>;
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "date": "2026-01-09",
    "rows": [
      {
        "employeeId": "EMP000123",
        "name": "John Doe",
        "status": "APPROVED",
        "time": "09:30",
        "approvedSalary": 400
      }
    ]
  }
}
```

---

#### `GET /api/admin/reports/daily.pdf`

Get daily attendance report as PDF.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  date: string; // YYYY-MM-DD format
}
```

**Example:** `GET /api/admin/reports/daily.pdf?date=2026-01-09`

**Response (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="daily-attendance-{date}.pdf"`
- **Body:** PDF binary data

---

#### `GET /api/admin/reports/daily.xlsx`

Get daily attendance report as Excel.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  date: string; // YYYY-MM-DD format
}
```

**Example:** `GET /api/admin/reports/daily.xlsx?date=2026-01-09`

**Response (200):**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="daily-attendance-{date}.xlsx"`
- **Body:** Excel binary data

---

### Monthly Salary Report

#### `GET /api/admin/reports/monthly-salary`

Get monthly salary report as JSON.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
}
```

**Example:** `GET /api/admin/reports/monthly-salary?month=2026-01`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    month: string; // YYYY-MM
    rows: Array<MonthlySalaryRow>;
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "month": "2026-01",
    "rows": [
      {
        "employeeId": "EMP000123",
        "name": "John Doe",
        "approvedDays": 20,
        "pendingDays": 2,
        "rejectedDays": 1,
        "totalSalary": 4000
      }
    ]
  }
}
```

**Notes:**
- Totals are computed from APPROVED attendance only

---

#### `GET /api/admin/reports/monthly-salary.pdf`

Get monthly salary report as PDF.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
}
```

**Example:** `GET /api/admin/reports/monthly-salary.pdf?month=2026-01`

**Response (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="monthly-salary-{month}.pdf"`
- **Body:** PDF binary data

---

#### `GET /api/admin/reports/monthly-salary.xlsx`

Get monthly salary report as Excel.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
}
```

**Example:** `GET /api/admin/reports/monthly-salary.xlsx?month=2026-01`

**Response (200):**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="monthly-salary-{month}.xlsx"`
- **Body:** Excel binary data

---

### Employee Summary Report

#### `GET /api/admin/reports/employee-summary`

Get employee summary for a month as JSON.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
  employeeId: string; // Minimum 3 characters
}
```

**Example:** `GET /api/admin/reports/employee-summary?month=2026-01&employeeId=EMP000123`

**Response (200):**
```typescript
{
  ok: true;
  data: {
    month: string; // YYYY-MM
    employee: {
      employeeId: string;
      name: string;
    };
    totalSalary: number; // Sum of approved salaries
    days: Array<EmployeeSummaryDay>;
  };
}
```

**Example:**
```json
{
  "ok": true,
  "data": {
    "month": "2026-01",
    "employee": {
      "employeeId": "EMP000123",
      "name": "John Doe"
    },
    "totalSalary": 4000,
    "days": [
      {
        "date": "2026-01-01",
        "status": "APPROVED",
        "time": "09:30",
        "proposedSalary": 400,
        "approvedSalary": 400,
        "warningMessage": ""
      },
      {
        "date": "2026-01-02",
        "status": "ABSENT",
        "time": "",
        "proposedSalary": 0,
        "approvedSalary": 0,
        "warningMessage": ""
      }
    ]
  }
}
```

**Error Responses:**
- **404**: Employee not found

**Notes:**
- Returns all days in the month (including ABSENT days)

---

#### `GET /api/admin/reports/employee-summary.pdf`

Get employee summary as PDF.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
  employeeId: string; // Minimum 3 characters
}
```

**Example:** `GET /api/admin/reports/employee-summary.pdf?month=2026-01&employeeId=EMP000123`

**Response (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="employee-summary-{employeeId}-{month}.pdf"`
- **Body:** PDF binary data

---

#### `GET /api/admin/reports/employee-summary.xlsx`

Get employee summary as Excel.

**Authentication:** Required (ADMIN role)

**Query Parameters:**
```typescript
{
  month: string; // YYYY-MM format
  employeeId: string; // Minimum 3 characters
}
```

**Example:** `GET /api/admin/reports/employee-summary.xlsx?month=2026-01&employeeId=EMP000123`

**Response (200):**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="employee-summary-{employeeId}-{month}.xlsx"`
- **Body:** Excel binary data

---

## Error Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation error, invalid input)
- **401**: Unauthorized (not authenticated)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (resource already exists, overlapping slots)
- **500**: Internal Server Error

---

## Example Workflow

### 1. Login
```bash
POST /api/auth/login
Headers: {
  "Content-Type": "application/json"
}
Body: {
  "employeeId": "EMP000123",
  "password": "OTP_OR_PASSWORD"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Store Token
Save the `token` from the response in localStorage (or similar):
```javascript
localStorage.setItem("auth_token", response.data.token);
```

### 3. Make Authenticated Requests
Include the token in the `Authorization` header:
```bash
GET /api/auth/me
Headers: {
  "Authorization": "Bearer <token>"
}
```

### 4. Logout
Remove token from storage:
```javascript
localStorage.removeItem("auth_token");
```

### 4. Mark Attendance (Employee)
```bash
POST /api/attendance/mark
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
Body: {}
```

### 5. Approve Attendance (Admin)
```bash
POST /api/admin/attendance/{id}/approve
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
Body: {
  "attendanceTimeISO": "2026-01-09T17:00:00.000+05:30",
  "adminNote": "Approved"
}
```

---

## Notes

1. **Timezone**: All dates/times use configurable timezone (default: `Asia/Kolkata`). Set via `APP_TIMEZONE` in `.env`.

2. **Grace Period**: Late attendance detection uses a 5-minute grace period after slot end time.

3. **Salary Calculation**: Salary is automatically calculated based on completed slots at attendance time. Employees never select slots manually.

4. **JWT Tokens**: Tokens are stateless and do not require server-side session storage. Tokens expire after the configured time (default: 15 minutes). Client should handle token refresh or re-login when token expires.

5. **Token Storage**: Store JWT tokens securely on the client (localStorage, sessionStorage, or secure cookie). Include token in `Authorization: Bearer <token>` header for all authenticated requests.

6. **Date Formats**:
   - Date: `YYYY-MM-DD` (e.g., "2026-01-09")
   - Month: `YYYY-MM` (e.g., "2026-01")
   - DateTime: ISO 8601 format (e.g., "2026-01-09T17:00:00.000+05:30")

