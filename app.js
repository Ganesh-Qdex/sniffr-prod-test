require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

// Middleware to parse JSON
app.use(express.json());

// Apply general rate limiting
app.use(generalLimiter);

// Authentication routes
app.use('/api/auth', authRoutes);

// GET /api/users - Get all users (protected)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/users/:id - Get user by ID (protected)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: error.message });
    }
});

// POST /api/users - Create a new user (protected)
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const user = new User({ name, email });
        await user.save();

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

// PUT /api/users/:id - Update an existing user (protected)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

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

// DELETE /api/users/:id - Delete a user (protected)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

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
    res.send('CRUD Demo API is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
