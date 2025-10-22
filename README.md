# Sniffr Production Testing - User CRUD API

This repository contains a Node.js Express API with MongoDB integration for User CRUD operations.

## Overview

A RESTful API built with Express.js and MongoDB (using Mongoose) that provides full Create, Read, Update, and Delete operations for user management.

## Features

- ✅ MongoDB database integration with Mongoose ORM
- ✅ Complete CRUD operations for User entity
- ✅ Input validation and error handling
- ✅ Unique email constraint
- ✅ Async/await implementation
- ✅ RESTful API design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone this repository
```bash
git clone <repository-url>
cd sniffr-prod-test
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory
```env
MONGODB_URI=mongodb://localhost:27017/sniffr-crud
PORT=3000
```

4. Make sure MongoDB is running on your system
```bash
# On Windows (if installed as service)
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

5. Start the application
```bash
npm start
```

## Project Structure

```
sniffr-prod-test/
├── app.js              # Main application file with API routes
├── config/
│   └── database.js     # MongoDB connection configuration
├── models/
│   └── User.js         # User schema and model
├── package.json        # Project dependencies and scripts
├── .env                # Environment variables (not in git)
└── README.md           # This file
```

## User Model

The User model includes the following fields:

- `name` (String, required, 2-50 characters)
- `email` (String, required, unique, valid email format)
- `createdAt` (Date, auto-generated)
- `updatedAt` (Date, auto-updated)

## API Endpoints

### 1. Get All Users
```http
GET /api/users
```
**Response:** Array of all users

### 2. Get User by ID
```http
GET /api/users/:id
```
**Parameters:** `id` - MongoDB ObjectId
**Response:** User object or 404 if not found

### 3. Create New User
```http
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```
**Response:** Created user object with 201 status

### 4. Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```
**Parameters:** `id` - MongoDB ObjectId
**Response:** Updated user object or 404 if not found

### 5. Delete User
```http
DELETE /api/users/:id
```
**Parameters:** `id` - MongoDB ObjectId
**Response:** 204 No Content on success

### 6. Health Check
```http
GET /
```
**Response:** Server status message

## Error Handling

The API provides comprehensive error handling for:
- **400 Bad Request**: Missing required fields, validation errors, duplicate email
- **404 Not Found**: User not found or invalid ObjectId
- **500 Internal Server Error**: Database or server errors

## Example Usage with cURL

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com"}'

# Get all users
curl http://localhost:3000/api/users

# Get user by ID
curl http://localhost:3000/api/users/507f1f77bcf86cd799439011

# Update a user
curl -X PUT http://localhost:3000/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane.smith@example.com"}'

# Delete a user
curl -X DELETE http://localhost:3000/api/users/507f1f77bcf86cd799439011
```

## Technologies Used

- **Express.js** - Web framework for Node.js
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM (Object Data Modeling) library
- **dotenv** - Environment variable management

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/sniffr-crud |
| PORT | Server port number | 3000 |

## Safety Notes

⚠️ **Important**: 
- Always use environment variables for sensitive configuration
- Ensure MongoDB is properly secured in production
- Validate and sanitize all user inputs
- Use HTTPS in production environments
- Implement authentication and authorization for production use

## License

MIT
