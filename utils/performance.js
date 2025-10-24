const os = require('os');
const process = require('process');

class PerformanceMonitor {
    constructor() {
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.responseTimes = [];
    }

    // Track request metrics
    trackRequest(responseTime, isError = false) {
        this.requestCount++;
        this.responseTimes.push(responseTime);
        
        if (isError) {
            this.errorCount++;
        }

        // Keep only last 1000 response times for memory efficiency
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
    }

    // Get system metrics
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            uptime: Date.now() - this.startTime,
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
            platform: {
                type: os.type(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                cpus: os.cpus().length,
            }
        };
    }

    // Get application metrics
    getApplicationMetrics() {
        const avgResponseTime = this.responseTimes.length > 0 
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
            : 0;

        const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);

        return {
            totalRequests: this.requestCount,
            errorCount: this.errorCount,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
            averageResponseTime: Math.round(avgResponseTime),
            p95ResponseTime: sortedTimes[p95Index] || 0,
            p99ResponseTime: sortedTimes[p99Index] || 0,
            requestsPerSecond: this.requestCount / ((Date.now() - this.startTime) / 1000),
        };
    }

    // Get comprehensive metrics
    getMetrics() {
        return {
            timestamp: new Date().toISOString(),
            system: this.getSystemMetrics(),
            application: this.getApplicationMetrics(),
        };
    }

    // Reset metrics
    reset() {
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.responseTimes = [];
    }
}

// Middleware to track request performance
const performanceMiddleware = (monitor) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            const isError = res.statusCode >= 400;
            monitor.trackRequest(responseTime, isError);
        });
        
        next();
    };
};

module.exports = {
    PerformanceMonitor,
    performanceMiddleware
};
