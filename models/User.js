const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Update the updatedAt timestamp before updating
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// Create indexes for better query performance
userSchema.index({ email: 1 }); // Unique index for email (already unique: true)
userSchema.index({ name: 1 }); // Index for name searches
userSchema.index({ createdAt: -1 }); // Index for sorting by creation date
userSchema.index({ updatedAt: -1 }); // Index for sorting by update date
userSchema.index({ name: 'text', email: 'text' }); // Text search index

// Compound indexes for common query patterns
userSchema.index({ name: 1, email: 1 }); // Compound index for name and email queries

const User = mongoose.model('User', userSchema);

module.exports = User;

