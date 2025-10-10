# Grovio Backend API Documentation

## Base URL

```
Development: http://localhost:5000
Production: https://your-backend-domain.com
```

## Authentication

Most endpoints require authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All endpoints return JSON responses in this format:

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    /* response data */
  },
  "user": {
    /* user object if applicable */
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"]
}
```

## API Endpoints

### Health Check

#### GET /api/health

Check server status and uptime.

**Response:**

```json
{
  "status": "healthy",
  "message": "Grovio Backend Server is running",
  "timestamp": "2024-01-20T10:00:00Z",
  "uptime": "5m 30s",
  "version": "1.0.0",
  "environment": "development"
}
```

---

### Authentication

#### POST /api/auth/signup

Register a new user account.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+233241234567",
  "password": "SecurePass123!"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "isEmailVerified": false,
    "isPhoneVerified": false,
    "role": "customer"
  }
}
```

#### POST /api/auth/signin

Sign in with email and password.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed in successfully",
  "user": {
    /* user object */
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string"
}
```

#### POST /api/auth/google

Authenticate with Google OAuth.

**Request Body:**

```json
{
  "idToken": "google_id_token",
  "nonce": "optional_nonce"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed in with Google successfully",
  "user": {
    /* user object */
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /api/auth/signout

Sign out current user.
**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

#### GET /api/auth/me

Get current user profile.
**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "User data retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "profilePicture": "https://...",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS",
      "familySize": 4
    }
  }
}
```

#### POST /api/auth/refresh

Refresh access token.

**Request Body:**

```json
{
  "refreshToken": "refresh_token_string"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

### Account Management

#### POST /api/account/check-email

Check email status (available, exists, deleted).

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "status": "deleted",
  "message": "Email was previously registered but account was deleted",
  "canRecover": true
}
```

**Possible status values:** `"available"`, `"exists"`, `"deleted"`

#### DELETE /api/account/delete

Soft delete user account.
**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "reason": "No longer need the service"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account deleted successfully. You can recover your account within 30 days if needed."
}
```

#### POST /api/account/recovery/initiate

Initiate account recovery for deleted accounts.

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account recovery initiated. Please check your email for recovery instructions."
}
```

#### POST /api/account/recovery/complete

Complete account recovery.

**Request Body:**

```json
{
  "email": "john@example.com",
  "recoveryToken": "recovery_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account recovered successfully. Please verify your email address.",
  "user": {
    /* user object */
  }
}
```

---

### OTP & Email Verification

#### POST /api/otp/send

Send email verification OTP.

**Request Body:**

```json
{
  "email": "john@example.com",
  "type": "signup"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

#### POST /api/otp/verify

Verify email OTP.

**Request Body:**

```json
{
  "email": "john@example.com",
  "token": "123456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "session": {
      /* session object */
    }
  }
}
```

#### GET /api/otp/verify-hash

Verify email with token hash (PKCE flow).

**Query Parameters:**

- `token_hash`: Token hash from email link
- `type`: `email` or `recovery`

**Success Response (200 or redirect):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "session": {
      /* session object */
    }
  }
}
```

#### POST /api/otp/reset-password

Send password reset email.

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

---

### Profile Management

#### GET /api/profile

Get current user profile.
**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    /* complete user object with preferences */
  }
}
```

#### PUT /api/profile

Update user profile.
**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Last",
  "phoneNumber": "+233241234567",
  "preferences": {
    "familySize": 4,
    "language": "en",
    "currency": "GHS",
    "dietaryRestrictions": ["vegetarian"],
    "preferredCategories": ["vegetables", "grains"]
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    /* updated user object */
  }
}
```

#### POST /api/profile/picture

Upload profile picture.
**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**

- `profilePicture`: Image file (JPEG, PNG, WebP, max 5MB)

**Success Response (200):**

```json
{
  "success": true,
  "profilePictureUrl": "https://storage.url/profile.jpg",
  "message": "Profile picture uploaded successfully"
}
```

#### DELETE /api/profile/picture

Delete profile picture.
**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile picture deleted successfully"
}
```

---

## Error Codes & Status

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Responses

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Email is required", "Password must be at least 8 characters long"]
}
```

**Authentication Error (401):**

```json
{
  "success": false,
  "message": "Not authenticated",
  "errors": ["Please sign in"]
}
```

**Rate Limit Error (429):**

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Request Examples

### JavaScript/Fetch

```javascript
// Sign up
const response = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+233241234567",
    password: "SecurePass123!",
  }),
});

// Authenticated request
const response = await fetch("/api/profile", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});

// File upload
const formData = new FormData();
formData.append("profilePicture", file);

const response = await fetch("/api/profile/picture", {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});
```

### cURL

```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+233241234567",
    "password": "SecurePass123!"
  }'

# Get profile
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer your_access_token"
```

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: Additional rate limiting may apply
- **File uploads**: 10 requests per 5 minutes per user

## Security Features

- **Password hashing**: bcrypt with 12 rounds
- **JWT tokens**: Secure access tokens with refresh mechanism
- **Input validation**: All inputs validated and sanitized
- **CORS protection**: Configured for specific origins
- **Rate limiting**: Protection against abuse
- **File upload security**: Type and size validation
