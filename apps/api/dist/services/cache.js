/**
 * Simple in-memory cache for frequently accessed data
 * Used to optimize API response times to <100ms
 */
class SimpleCache {
    cache = new Map();
    set(key, data, ttlMs = 60000) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    clear(key) {
        if (key) {
            this.cache.delete(key);
        }
        else {
            this.cache.clear();
        }
    }
    // Clear cache when slots are updated
    invalidateSlots() {
        this.cache.delete("slots:active");
        this.cache.delete("slots:all");
    }
}
export const cache = new SimpleCache();
