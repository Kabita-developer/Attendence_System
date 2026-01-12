# Admin Dashboard API Endpoints

This document lists all API endpoints used by the Admin Dashboard (`/admin`).

**Base URL:** `http://localhost:4000/api` (or via Next.js proxy at `/api`)

**Authentication:** All endpoints require JWT token in `Authorization: Bearer <token>` header.

**All endpoints require ADMIN role.**

---

## 1. Employee Management

### Create Employee
**POST** `/api/admin/employees`

Creates a new employee with auto-generated Employee ID. All fields (name, email, phone, password) are required. Password is stored in plain text.

**Request Body:** (all fields required)
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "password": "TempPass@123"
}
```

**Note:** Password is stored in plain text format in the database.

**Response:**
```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP000123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91 98765 43210"
    }
  }
}
```

**Used in:** Admin Dashboard - Quick create employee form

---

### List All Employees
**GET** `/api/admin/employees`

Returns all employees sorted by employee ID.

**Response:**
```json
{
  "ok": true,
  "data": {
    "employees": [
      {
        "id": "507f1f77bcf86cd799439011",
        "employeeId": "EMP000123",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91 98765 43210",
        "password": "TempPass@123",
        "isActive": true,
        "mustChangePassword": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Note:** Password is returned in plain text format as stored in the database.

**Used in:** Admin Employees page

---

### Update Employee
**POST** `/api/admin/employees/:id/update`

Updates an employee. All fields are optional - only provided fields will be updated.

**URL Parameters:**
- `id` - Employee ID (MongoDB ObjectId)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+91 99999 99999",
  "password": "NewPassword123",
  "isActive": true
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP000123",
      "name": "Updated Name",
      "email": "updated@example.com",
      "phone": "+91 99999 99999"
    }
  }
}
```

**Note:** Password is stored in plain text format.

**Used in:** Admin Employees page

---

### Delete Employee
**POST** `/api/admin/employees/:id/delete`

Hard deletes an employee. Permanently removes the employee from the database.

**URL Parameters:**
- `id` - Employee ID (MongoDB ObjectId)

**Response:**
```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

**Note:** This is a hard delete - the employee record is permanently removed.

**Used in:** Admin Employees page

---

## 2. Slot Management

### Get All Slots
**GET** `/api/admin/slots`

Returns all slots sorted by active status, sort order, and end time.

**Response:**
```json
{
  "ok": true,
  "data": {
    "slots": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Morning Shift",
        "startMinutes": 600,  // 10:00 AM
        "endMinutes": 720,    // 12:00 PM
        "salary": 200,
        "isActive": true,
        "sortOrder": 1
      }
    ]
  }
}
```

**Used in:** Admin Dashboard - Slot snapshot section

---

### Create Slot
**POST** `/api/admin/slots`

Creates a new time slot.

**Request Body:**
```json
{
  "name": "Evening Shift",
  "startMinutes": 1080,  // 18:00 (6:00 PM)
  "endMinutes": 1320,    // 22:00 (10:00 PM)
  "salary": 300,
  "sortOrder": 2,
  "isActive": true
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "slot": {
      "id": "507f1f77bcf86cd799439012"
    }
  }
}
```

**Error Responses:**
- `400` - Invalid time range (endMinutes <= startMinutes)
- `409` - Slot overlaps with existing active slot

**Used in:** Admin Dashboard - Quick add slot form

---

### Update Slot
**POST** `/api/admin/slots/:id/update`

Updates an existing slot.

**URL Parameters:**
- `id` - Slot ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Shift Name",
  "startMinutes": 600,
  "endMinutes": 720,
  "salary": 250,
  "sortOrder": 1,
  "isActive": false
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "updated": true
  }
}
```

**Used in:** Admin Slots page

---

## 3. Attendance Management

### Get Attendance Records
**GET** `/api/admin/attendance?month=YYYY-MM&employeeId=EMP000123`

Returns attendance records for a specific month, optionally filtered by employee.

**Query Parameters:**
- `month` (required) - Format: `YYYY-MM` (e.g., "2024-01")
- `employeeId` (optional) - Filter by employee ID

**Response:**
```json
{
  "ok": true,
  "data": {
    "month": "2024-01",
    "attendance": [
      {
        "id": "507f1f77bcf86cd799439013",
        "userId": "507f1f77bcf86cd799439011",
        "date": "2024-01-15",
        "time": "2024-01-15T10:30:00.000Z",
        "status": "PENDING",
        "proposedSlots": 1.5,
        "proposedSalary": 300,
        "approvedSlots": 0,
        "approvedSalary": 0,
        "warningMessage": "Late by 30 minutes",
        "lateByMinutes": 30
      }
    ]
  }
}
```

**Used in:** Admin Dashboard - Pending approvals section

---

### Approve Attendance
**POST** `/api/admin/attendance/:id/approve`

Approves a pending attendance record.

**URL Parameters:**
- `id` - Attendance record ID

**Request Body:** (optional)
```json
{
  "attendanceTimeISO": "2024-01-15T10:00:00.000Z",  // optional: override time
  "adminNote": "Approved with note"  // optional
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "approved": true
  }
}
```

**Used in:** Admin Dashboard - Approve button in pending approvals

---

### Reject Attendance
**POST** `/api/admin/attendance/:id/reject`

Rejects a pending attendance record.

**URL Parameters:**
- `id` - Attendance record ID

**Request Body:** (optional)
```json
{
  "adminNote": "Rejected: Invalid attendance"  // optional
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "rejected": true
  }
}
```

**Used in:** Admin Dashboard - Reject button in pending approvals

---

### Upsert Attendance (Create/Update)
**POST** `/api/admin/attendance/upsert`

Creates or updates an attendance record for a specific employee and date.

**Request Body:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2024-01-15",
  "attendanceTimeISO": "2024-01-15T10:00:00.000Z",  // optional
  "status": "APPROVED",  // "APPROVED" | "PENDING" | "REJECTED"
  "adminNote": "Manual entry"  // optional
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "507f1f77bcf86cd799439013"
  }
}
```

**Used in:** Admin Attendance page

---

### Clear Attendance
**POST** `/api/admin/attendance/clear`

Deletes an attendance record and associated salary logs.

**Request Body:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2024-01-15"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "cleared": true
  }
}
```

**Used in:** Admin Attendance page

---

### Delete Attendance
**POST** `/api/admin/attendance/delete`

Deletes an attendance record (keeps salary logs for audit).

**Request Body:**
```json
{
  "employeeId": "EMP000123",
  "dateISO": "2024-01-15"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

**Used in:** Admin Attendance page

---

## 4. Reports

### Daily PDF Report
**GET** `/api/admin/reports/daily.pdf?date=YYYY-MM-DD`

Downloads a PDF report of daily attendance.

**Query Parameters:**
- `date` (required) - Format: `YYYY-MM-DD` (e.g., "2024-01-15")

**Response:** PDF file download

**Used in:** Admin Dashboard - Daily PDF export button

---

### Daily Excel Report
**GET** `/api/admin/reports/daily.xlsx?date=YYYY-MM-DD`

Downloads an Excel report of daily attendance.

**Query Parameters:**
- `date` (required) - Format: `YYYY-MM-DD` (e.g., "2024-01-15")

**Response:** Excel file download

**Used in:** Admin Dashboard - Daily Excel export button

---

### Monthly PDF Report
**GET** `/api/admin/reports/monthly.pdf?month=YYYY-MM&employeeId=EMP000123`

Downloads a PDF report of monthly attendance.

**Query Parameters:**
- `month` (required) - Format: `YYYY-MM` (e.g., "2024-01")
- `employeeId` (optional) - Filter by employee

**Response:** PDF file download

**Used in:** Admin Reports page

---

### Monthly Excel Report
**GET** `/api/admin/reports/monthly.xlsx?month=YYYY-MM&employeeId=EMP000123`

Downloads an Excel report of monthly attendance.

**Query Parameters:**
- `month` (required) - Format: `YYYY-MM` (e.g., "2024-01")
- `employeeId` (optional) - Filter by employee

**Response:** Excel file download

**Used in:** Admin Reports page

---

## 5. Authentication

### Get Current User
**GET** `/api/auth/me`

Returns the current authenticated user's information.

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439010",
      "role": "ADMIN",
      "employeeId": "ADMIN",
      "name": "Admin User",
      "mustChangePassword": false
    }
  }
}
```

**Used in:** SessionGuard component (validates admin access)

---

## Summary: Admin Dashboard API Usage

The Admin Dashboard (`/admin`) uses these endpoints:

1. **On Page Load:**
   - `GET /api/admin/slots` - Load slot snapshot
   - `GET /api/admin/attendance?month=YYYY-MM` - Load pending approvals

2. **Quick Actions:**
   - `POST /api/admin/employees` - Create employee
   - `POST /api/admin/slots` - Create slot
   - `POST /api/admin/attendance/:id/approve` - Approve attendance
   - `POST /api/admin/attendance/:id/reject` - Reject attendance
   - `GET /api/admin/reports/daily.xlsx?date=YYYY-MM-DD` - Export daily Excel

3. **Navigation:**
   - All other admin pages use additional endpoints (see `FRONTEND_API_INTEGRATION.md`)

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "ok": false,
  "error": {
    "message": "Error description",
    "status": 400
  }
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not admin role)
- `404` - Not Found
- `409` - Conflict (e.g., slot overlap)

---

## Notes

- All time values are in minutes since midnight (0-1439)
- Dates use ISO format (`YYYY-MM-DD`)
- Timestamps use ISO 8601 format with timezone
- Salary calculations are automatic based on slot times and attendance time
- Pending status occurs when attendance is late (after slot end + 5 minutes grace period)

