# Authentication Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/sniffr-prod-test

# JWT Secret (change this to a secure random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=3000
```

## Installation

Install the new dependencies:

```bash
npm install
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Protected CRUD Endpoints

All existing CRUD endpoints now require authentication:

- `GET /api/users` - Get all users (protected)
- `GET /api/users/:id` - Get user by ID (protected)
- `POST /api/users` - Create a new user (protected)
- `PUT /api/users/:id` - Update an existing user (protected)
- `DELETE /api/users/:id` - Delete a user (protected)

## Usage Examples

### Register a new user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'
```

### Access protected routes:
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- General rate limiting (100 requests per 15 minutes)
- Password validation (minimum 6 characters)
- Email validation
- Token expiration (24 hours)

## Notes

- Passwords are automatically hashed before saving
- JWT tokens expire after 24 hours
- All CRUD operations now require authentication
- Rate limiting helps prevent brute force attacks
- The JWT_SECRET should be changed to a secure random string in production
