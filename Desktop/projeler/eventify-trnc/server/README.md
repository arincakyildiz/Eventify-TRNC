# Eventify TRNC - Backend API

Backend API for Eventify TRNC event management system built with Node.js, Express.js, and MongoDB.

## Features

- 🔐 User authentication (JWT-based)
- 📧 Email verification with code
- 🎫 Event management (CRUD operations)
- 📝 Event registration management
- 👤 User profile management
- 🔒 Admin panel API
- 🛡️ Security middleware (Helmet, CORS)
- 📊 MongoDB database with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the `server/` directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/eventify-trnc
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@eventify.trnc
ADMIN_PASSWORD=admin123
CORS_ORIGIN=http://localhost:3000,http://localhost:8000
```

3. Make sure MongoDB is running locally or update `MONGODB_URI` for MongoDB Atlas.

4. Seed the database (optional):
```bash
npm run seed
```

5. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user (sends verification code)
- `POST /api/auth/verify` - Verify email with code
- `POST /api/auth/resend-code` - Resend verification code
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Events (`/api/events`)

- `GET /api/events` - Get all events (with optional filters: city, category, date, search, upcoming)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Admin only)
- `PUT /api/events/:id` - Update event (Admin only)
- `DELETE /api/events/:id` - Delete event (Admin only)

### Registrations (`/api/registrations`)

- `GET /api/registrations` - Get user's registrations (Protected)
- `GET /api/registrations/:id` - Get single registration (Protected)
- `POST /api/registrations` - Register for event (Protected)
- `PUT /api/registrations/:id/cancel` - Cancel registration (Protected)

### Admin (`/api/admin`)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get current admin (Protected)
- `GET /api/admin/events/:eventId/registrations` - Get event registrations (Protected)

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `ADMIN_EMAIL` | Default admin email | `admin@eventify.trnc` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:8000` |
| `EMAIL_SERVICE` | Email service (gmail for Gmail, leave empty for SMTP) | Optional |
| `EMAIL_HOST` | SMTP host | Required for SMTP |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_SECURE` | Use SSL/TLS | `false` |
| `EMAIL_USER` | Email username | Required for production |
| `EMAIL_PASSWORD` | Email password | Required for production |
| `EMAIL_FROM` | Sender email address | `noreply@eventify.trnc` |

**Note:** In development mode, if email configuration is not provided, emails will be logged to console instead of being sent.

## Project Structure

```
server/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Auth logic
│   ├── adminController.js   # Admin logic
│   ├── eventController.js   # Event logic
│   └── registrationController.js  # Registration logic
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Error handling middleware
├── models/
│   ├── User.js              # User model
│   ├── Admin.js             # Admin model
│   ├── Event.js             # Event model
│   └── Registration.js      # Registration model
├── routes/
│   ├── auth.js              # Auth routes
│   ├── admin.js             # Admin routes
│   ├── events.js            # Event routes
│   └── registrations.js     # Registration routes
├── utils/
│   └── seed.js              # Database seeding script
├── .env.example             # Environment variables example
├── .gitignore
├── package.json
├── server.js                # Main server file
└── README.md
```

## Testing

Run tests with Jest:
```bash
npm test
```

## Deployment

The backend can be deployed on Render, Heroku, or any Node.js hosting platform. Make sure to:

1. Set all environment variables in your hosting platform
2. Use MongoDB Atlas for cloud database
3. Update `CORS_ORIGIN` to include your frontend URL
4. Use a strong `JWT_SECRET` in production
5. Set `NODE_ENV=production`

