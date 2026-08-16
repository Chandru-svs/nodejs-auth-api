# Node.js Authentication API

A RESTful authentication API built with Node.js, Express.js, MongoDB, Redis, and JWT.

This project implements authentication, session management, password recovery, OTP verification, and role management with a focus on API security and validation.

## Features

- User signup and signin
- Email/mobile OTP authentication
- JWT access and refresh tokens
- Redis-based refresh token/session management
- Device-based sessions for web, mobile, and tablet
- Logout and session invalidation
- Forgot and reset password
- Change password
- User profile
- Role management
- Joi request validation
- Password hashing with bcrypt
- API rate limiting
- Helmet security headers
- CORS configuration
- Centralized error handling
- Health check endpoint
- Graceful MongoDB and Redis shutdown

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis
- JWT
- Joi
- bcryptjs
- Helmet
- Express Rate Limit

## Authentication Flow

```text
Signup / Signin / OTP Verification
              ↓
       Access Token
       Refresh Token
              ↓
     Refresh Token → Redis
              ↓
      Access Token Refresh

      Refresh tokens are stored in Redis based on the user's device type:

userId:web
userId:mobile
userId:tablet

API Endpoints
Authentication

Method	Endpoint	            Description
POST	/signup	                Register a new user
POST	/signin	                Login with credentials
POST	/otp/send	            Send OTP
POST	/otp/verify	            Verify OTP
POST	/refresh-token	        Generate a new access token
POST	/logout	                Logout current session
POST	/auth/forgot-password	Start password recovery
POST	/auth/reset-password	Reset password
PATCH	/change-password	    Change password
GET	    /profile	            Get authenticated user profile

Other
Method	Endpoint	Description
GET	    /health	        Check API status

Project Structure
app/
├── config/          # Database and environment configuration
├── controllers/     # Request handling
├── middlewares/     # Authentication, validation and responses
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # JWT, Redis and external services
├── utils/           # Common utilities
└── validators/      # Joi validation schemas


index.js             # Application entry point

Getting Started
1. Clone the repository
git clone https://github.com/Chandru-svs/nodejs-auth-api.git
cd nodejs-auth-api
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file using .env.example:

copy .env.example .env

Configure the required MongoDB, Redis, and JWT environment variables.

4. Run the application

Development: npm run dev

Production: npm start

Security:
Passwords are hashed using bcrypt.
JWT is used for access and refresh token authentication.
Refresh tokens are stored in Redis.
OTP/reset tokens have expiry and attempt limits.
Joi is used for request validation.
Helmet provides security-related HTTP headers.
Rate limiting is applied to API requests.
Sensitive configuration is stored using environment variables.
API Testing

The APIs have been tested locally using Postman.

Future Improvements:
Automated unit and integration tests
Swagger/OpenAPI documentation
Docker and Docker Compose
CI/CD pipeline