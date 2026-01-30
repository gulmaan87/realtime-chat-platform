# Auth Service

Authentication service for the realtime chat platform.

## Features

- User registration
- User login
- JWT token generation (access & refresh tokens)
- Token verification
- Token refresh
- Password hashing with bcrypt
- Protected routes middleware

## API Endpoints

### Public Endpoints

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "username": "user1",
    "email": "user1@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "username": "user1",
    "password": "password123"
  }
  ```

- `POST /api/auth/verify` - Verify JWT token
  Headers: `Authorization: Bearer <token>`

- `POST /api/auth/refresh` - Refresh access token
  ```json
  {
    "refreshToken": "<refresh_token>"
  }
  ```

### Protected Endpoints

- `GET /api/auth/me` - Get current user info
  Headers: `Authorization: Bearer <token>`

## Environment Variables

Add to `.env` file:

```env
AUTH_PORT=3002
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://redis:6379
BCRYPT_ROUNDS=10
```

## Running Locally

```bash
npm install
npm run dev
```

## Docker

The service is included in docker-compose.yml and will run on port 3002.

