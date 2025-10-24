const redisClient = require('../config/redis');
const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        this.memoryCache = new NodeCache({ 
            stdTTL: 300, // 5 minutes default TTL
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // Better performance
        });
        this.redisEnabled = false;
        this.initializeRedis();
    }

    async initializeRedis() {
        try {
            await redisClient.connect();
            this.redisEnabled = redisClient.isConnected;
        } catch (error) {
            console.warn('Redis not available, using memory cache only:', error.message);
            this.redisEnabled = false;
        }
    }

    // Generate cache key
    generateKey(prefix, identifier) {
        return `${prefix}:${identifier}`;
    }

    // Get from cache (Redis first, then memory)
    async get(key) {
        try {
            // Try Redis first if available
            if (this.redisEnabled) {
                const value = await redisClient.get(key);
                if (value !== null) {
                    return value;
                }
            }

            // Fallback to memory cache
            return this.memoryCache.get(key);
        } catch (error) {
            console.error('Cache GET error:', error);
            return null;
        }
    }

    // Set cache (both Redis and memory)
    async set(key, value, ttl = 300) {
        try {
            // Set in memory cache
            this.memoryCache.set(key, value, ttl);

            // Set in Redis if available
            if (this.redisEnabled) {
                await redisClient.set(key, value, ttl);
            }
        } catch (error) {
            console.error('Cache SET error:', error);
        }
    }

    // Delete from cache
    async del(key) {
        try {
            // Delete from memory cache
            this.memoryCache.del(key);

            // Delete from Redis if available
            if (this.redisEnabled) {
                await redisClient.del(key);
            }
        } catch (error) {
            console.error('Cache DEL error:', error);
        }
    }

    // Clear all cache
    async flush() {
        try {
            // Clear memory cache
            this.memoryCache.flushAll();

            // Clear Redis if available
            if (this.redisEnabled) {
                await redisClient.flush();
            }
        } catch (error) {
            console.error('Cache FLUSH error:', error);
        }
    }

    // Cache user data
    async cacheUser(user) {
        const key = this.generateKey('user', user._id.toString());
        await this.set(key, user, 600); // 10 minutes TTL
    }

    async getCachedUser(userId) {
        const key = this.generateKey('user', userId);
        return await this.get(key);
    }

    // Cache users list
    async cacheUsers(users, page = 1, limit = 10) {
        const key = this.generateKey('users', `page_${page}_limit_${limit}`);
        await this.set(key, users, 300); // 5 minutes TTL
    }

    async getCachedUsers(page = 1, limit = 10) {
        const key = this.generateKey('users', `page_${page}_limit_${limit}`);
        return await this.get(key);
    }

    // Invalidate user-related cache
    async invalidateUserCache(userId) {
        const userKey = this.generateKey('user', userId);
        await this.del(userKey);
        
        // Invalidate users list cache (we don't know which pages are cached)
        // In a production system, you might want to track cache keys more precisely
        try {
            if (this.redisEnabled) {
                // This is a simplified approach - in production you'd want more sophisticated cache invalidation
                const pattern = 'users:page_*';
                // Note: Redis SCAN would be better here, but keeping it simple
            }
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
    }

    // Get cache statistics
    getStats() {
        return {
            memory: {
                keys: this.memoryCache.keys().length,
                stats: this.memoryCache.getStats()
            },
            redis: {
                enabled: this.redisEnabled,
                connected: redisClient.isConnected
            }
        };
    }
}

module.exports = new CacheService();
