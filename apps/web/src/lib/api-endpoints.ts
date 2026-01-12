/**
 * API Endpoints Configuration
 * 
 * This file documents all available API endpoints for type safety and reference.
 * All endpoints are prefixed with /api when using apiFetch().
 */

// Base API paths
export const API_PATHS = {
  // Health
  health: "/health",
  healthDebug: "/health/debug-env",

  // Authentication
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    me: "/auth/me",
    changePassword: "/auth/change-password",
    adminSignup: "/auth/admin/signup",
    adminRequestPasswordReset: "/auth/admin/request-password-reset",
    adminConfirmPasswordReset: "/auth/admin/confirm-password-reset"
  },

  // Slots (Public - requires auth)
  slots: "/slots",

  // Employee Attendance
  attendance: {
    mark: "/attendance/mark",
    me: "/attendance/me" // Query: ?month=YYYY-MM
  },

  // Employee Reports
  reports: {
    salarySlipPdf: "/reports/me/salary-slip.pdf" // Query: ?month=YYYY-MM
  },

  // Admin - Employees
  admin: {
    employees: "/admin/employees",
    employeeUpdate: (id: string) => `/admin/employees/${id}/update`,
    employeeDelete: (id: string) => `/admin/employees/${id}/delete`,
    
    // Admin - Slots
    slots: "/admin/slots",
    slotUpdate: (id: string) => `/admin/slots/${id}/update`,
    slotDelete: (id: string) => `/admin/slots/${id}/delete`,
    
    // Admin - Attendance
    attendance: "/admin/attendance", // Query: ?month=YYYY-MM&employeeId=EMP000123
    attendanceApprove: (id: string) => `/admin/attendance/${id}/approve`,
    attendanceReject: (id: string) => `/admin/attendance/${id}/reject`,
    attendanceUpsert: "/admin/attendance/upsert",
    attendanceClear: "/admin/attendance/clear",
    attendanceDelete: "/admin/attendance/delete",
    
    // Admin - Reports
    reports: {
      daily: "/admin/reports/daily", // Query: ?date=YYYY-MM-DD
      dailyPdf: "/admin/reports/daily.pdf", // Query: ?date=YYYY-MM-DD
      dailyXlsx: "/admin/reports/daily.xlsx", // Query: ?date=YYYY-MM-DD
      monthlySalary: "/admin/reports/monthly-salary", // Query: ?month=YYYY-MM
      monthlySalaryPdf: "/admin/reports/monthly-salary.pdf", // Query: ?month=YYYY-MM
      monthlySalaryXlsx: "/admin/reports/monthly-salary.xlsx", // Query: ?month=YYYY-MM
      employeeSummary: "/admin/reports/employee-summary", // Query: ?month=YYYY-MM&employeeId=EMP000123
      employeeSummaryPdf: "/admin/reports/employee-summary.pdf", // Query: ?month=YYYY-MM&employeeId=EMP000123
      employeeSummaryXlsx: "/admin/reports/employee-summary.xlsx" // Query: ?month=YYYY-MM&employeeId=EMP000123
    }
  }
} as const;

/**
 * Helper function to build query strings
 */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Example usage:
 * 
 * import { apiFetch } from "@/lib/api";
 * import { API_PATHS, buildQuery } from "@/lib/api-endpoints";
 * 
 * // GET request
 * const res = await apiFetch(API_PATHS.attendance.me + buildQuery({ month: "2026-01" }));
 * 
 * // POST request
 * const res = await apiFetch(API_PATHS.attendance.mark, {
 *   method: "POST",
 *   json: {}
 * });
 */

