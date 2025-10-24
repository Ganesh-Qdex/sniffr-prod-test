require('dotenv').config();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const connectDB = require('./config/database');
const User = require('./models/User');
const cacheService = require('./services/cacheService');
const { PerformanceMonitor, performanceMiddleware } = require('./utils/performance');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Performance monitoring middleware
app.use(performanceMiddleware(performanceMonitor));

// Middleware to parse JSON with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GET /api/users - Get all users with pagination and caching
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Check cache first
        const cacheKey = `users_page_${page}_limit_${limit}_sort_${sortBy}_${sortOrder}`;
        let users = await cacheService.get(cacheKey);

        if (!users) {
            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder;

            // Get users with pagination
            const [usersData, totalCount] = await Promise.all([
                User.find()
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .select('name email createdAt updatedAt')
                    .lean(), // Use lean() for better performance
                User.countDocuments()
            ]);

            users = {
                data: usersData,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPrevPage: page > 1
                }
            };

            // Cache the result for 5 minutes
            await cacheService.set(cacheKey, users, 300);
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/:id - Get user by ID with caching
app.get('/api/users/:id', async (req, res) => {
    try {
        // Check cache first
        let user = await cacheService.getCachedUser(req.params.id);

        if (!user) {
            user = await User.findById(req.params.id).lean();
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Cache the user for 10 minutes
            await cacheService.cacheUser(user);
        }

        res.json(user);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Create a new user with validation
app.post('/api/users', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { name, email } = req.body;

        const user = new User({ name, email });
        await user.save();

        // Invalidate users list cache
        await cacheService.invalidateUserCache(user._id);

        res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id - Update an existing user with validation
app.put('/api/users/:id', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { name, email } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Invalidate cache for this user and users list
        await cacheService.invalidateUserCache(user._id);

        res.json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: 'User not found' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/users/:id - Delete a user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Invalidate cache for this user and users list
        await cacheService.invalidateUserCache(user._id);

        res.status(204).send();
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'CRUD Demo API is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
    try {
        const metrics = performanceMonitor.getMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
});

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
    try {
        const stats = cacheService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cache statistics' });
    }
});

// Clear cache endpoint (for development/testing)
app.delete('/api/cache', async (req, res) => {
    try {
        await cacheService.flush();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// Search users endpoint with text search
app.get('/api/users/search', async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const skip = (page - 1) * limit;
        
        const users = await User.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name email createdAt updatedAt')
        .lean();

        res.json({
            data: users,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                query: q
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Performance monitoring available at http://localhost:${PORT}/api/metrics`);
    console.log(`Cache statistics available at http://localhost:${PORT}/api/cache/stats`);
});
