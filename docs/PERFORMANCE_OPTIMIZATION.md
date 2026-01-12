# API Performance Optimization (<100ms Target)

This document outlines the performance optimizations implemented to ensure all API requests complete within 100ms.

## Optimizations Implemented

### 1. **In-Memory Caching**
- **Location**: `apps/api/src/services/cache.ts`
- **Purpose**: Cache frequently accessed data to avoid database queries
- **Cached Data**:
  - Active slots (5-minute TTL)
  - Individual slot lookups (5-minute TTL)
  - User authentication lookups (1-minute TTL)

### 2. **Database Query Optimizations**

#### **Select Only Required Fields**
- All queries now use `.select()` to fetch only needed fields
- Reduces data transfer and memory usage
- Examples:
  - Login: Only selects `_id, role, employeeId, name, passwordHash, isActive, mustChangePassword`
  - Slot queries: Only selects `name, startMinutes, endMinutes, salary, isActive`
  - Attendance queries: Only selects relevant fields based on endpoint

#### **Use `.lean()` for Read-Only Queries**
- All read queries use `.lean()` to return plain JavaScript objects
- Avoids Mongoose document overhead
- Faster JSON serialization

#### **Optimized Indexes**
- **User Model**: Added compound index `{ role: 1, isActive: 1 }` for employee queries
- **Attendance Model**: Added compound index `{ attendanceDate: 1, userId: 1, status: 1 }` for admin queries
- Existing indexes maintained for unique constraints and common lookups

### 3. **Authentication Middleware Optimization**
- **Location**: `apps/api/src/middlewares/auth.ts`
- **Changes**:
  - Caches user lookups for 1 minute (JWT already contains role/employeeId)
  - Only queries database if cache miss
  - Selects only `role, employeeId, isActive` fields

### 4. **Route-Specific Optimizations**

#### **Slots Endpoint** (`GET /api/slots`)
- Caches active slots for 5 minutes
- Uses compound index `{ isActive: 1, sortOrder: 1, endMinutes: 1 }`
- Selects only required fields

#### **Attendance Marking** (`POST /api/attendance/mark`)
- Caches slot lookups
- Uses unique compound index `{ userId: 1, attendanceDate: 1, slotId: 1 }` for duplicate checks
- Selects only `_id, status` for existence checks

#### **Attendance Listing** (`GET /api/attendance/me`)
- Uses compound index `{ userId: 1, attendanceDate: 1 }`
- Selects only needed fields
- Optimized populate for slot data

#### **Admin Routes**
- Employee list: Uses index on `role`, selects only needed fields
- Employee update/delete: Selects only required fields before operations
- Attendance queries: Uses compound indexes, selects minimal fields

### 5. **Performance Monitoring**
- **Location**: `apps/api/src/middlewares/performance.ts`
- **Features**:
  - Logs warnings for requests taking >100ms
  - Adds `X-Response-Time` header to all responses
  - Helps identify slow endpoints in production

### 6. **Cache Invalidation**
- Cache is automatically invalidated when:
  - Slots are created, updated, or deleted
  - Individual slot cache cleared on slot operations
- Ensures data consistency while maintaining performance

## Performance Targets

- **Target**: All API requests < 100ms
- **Monitoring**: Slow requests (>100ms) are logged with endpoint and duration
- **Response Header**: `X-Response-Time` header added to all responses

## Best Practices Applied

1. **Minimize Database Round Trips**: Use caching and compound queries
2. **Select Only Needed Fields**: Reduce data transfer
3. **Use Indexes**: Compound indexes for common query patterns
4. **Lean Queries**: Use `.lean()` for read-only operations
5. **Cache Frequently Accessed Data**: Slots and user lookups
6. **Monitor Performance**: Track slow requests for continuous optimization

## Testing Performance

To verify performance improvements:

1. Check server logs for slow request warnings
2. Monitor `X-Response-Time` header in API responses
3. Use tools like `curl` or Postman to measure response times:
   ```bash
   curl -w "@curl-format.txt" -H "Authorization: Bearer <token>" http://localhost:3000/api/slots
   ```

## Future Optimizations (if needed)

If some endpoints still exceed 100ms:

1. **Database Connection Pooling**: Ensure MongoDB connection pool is optimized
2. **Response Compression**: Enable gzip compression for large responses
3. **Pagination**: For large datasets, implement pagination
4. **Background Jobs**: Move heavy operations (PDF generation, reports) to background workers
5. **Redis Cache**: Replace in-memory cache with Redis for multi-instance deployments

