# Grovio Backend Server

A traditional Express.js backend server built with Next.js TypeScript, featuring Supabase authentication and a proper MVC architecture.

## 🏗️ Architecture

This is a **traditional backend server structure** with:

- **Express.js** server with TypeScript
- **Controllers** for handling HTTP requests
- **Services** for business logic
- **Middleware** for authentication, validation, and error handling
- **Routes** for organizing endpoints
- **Supabase** for database and authentication

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts              # Main server entry point
│   ├── config/
│   │   └── supabase.ts        # Supabase client configuration
│   ├── controllers/
│   │   ├── auth.controller.ts  # Authentication controller
│   │   └── health.controller.ts # Health check controller
│   ├── services/
│   │   ├── auth.service.ts     # Authentication business logic
│   │   ├── user.service.ts     # User management logic
│   │   └── health.service.ts   # Health check logic
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT authentication
│   │   ├── validation.middleware.ts # Request validation
│   │   ├── error.middleware.ts     # Error handling
│   │   └── notFound.middleware.ts  # 404 handler
│   ├── routes/
│   │   ├── auth.routes.ts      # Authentication routes
│   │   └── health.routes.ts    # Health check routes
│   ├── types/
│   │   ├── auth.ts            # Authentication types
│   │   └── api.types.ts       # API response types
│   ├── utils/
│   │   └── auth.ts            # Password hashing utilities
│   └── database/
│       └── schema.sql         # Database schema
├── package.json
├── tsconfig.json
├── nodemon.json
└── README.md
```

##  Quick Start

### 1. Environment Setup

Create a `.env.local` file using one of these methods:

**Option A: Use the creation script**

Windows:
```bash
create-env.bat
```

macOS/Linux:
```bash
chmod +x create-env.sh
./create-env.sh
```

**Option B: Create manually**

Copy `env.example` to `.env.local` and update with your values:

```env
PORT=5000
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://tophzoixrwfugwnewmoh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
RESEND_API_KEY=re_xxxx
EMAIL_FROM=onboarding@resend.dev
```

 **Important**: You must add your actual `SUPABASE_SERVICE_ROLE_KEY` from your Supabase dashboard (Settings > API).

**Email (Resend – invoices, order confirmation, recovery):** All transactional emails use Resend. Set `RESEND_API_KEY` (from [Resend](https://resend.com)). The **sender address** is `EMAIL_FROM`. Resend only allows sending from **verified** senders:
- **Testing:** Use `EMAIL_FROM=onboarding@resend.dev` (Resend’s default; works on free tier).
- **Production:** In Resend, add and verify your domain (e.g. grovio.com), then set `EMAIL_FROM=orders@yourdomain.com` (or similar). If `EMAIL_FROM` is unset or uses an unverified address, emails may not be delivered.

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or run the dependency installation script
# On Windows:
install-deps.bat

# On macOS/Linux:
chmod +x install-deps.sh
./install-deps.sh
```

### 3. Database Setup

Run the SQL commands in `src/database/schema.sql` in your Supabase SQL Editor.

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

##  API Endpoints

### Health Check
- **GET** `/api/health` - Basic health check
- **GET** `/api/health/detailed` - Detailed health with DB status

### Authentication
- **POST** `/api/auth/signup` - User registration
- **POST** `/api/auth/signin` - User login
- **GET** `/api/auth/google` - Initiate Google OAuth (SSR with PKCE)
- **GET** `/api/auth/google/callback` - Google OAuth callback (automatic)
- **POST** `/api/auth/google/session` - Process session (client-side flow)
- **POST** `/api/auth/google` - Legacy ID token method
- **POST** `/api/auth/signout` - User logout
- **GET** `/api/auth/me` - Get current user
- **PUT** `/api/auth/me` - Update user profile
- **POST** `/api/auth/refresh` - Refresh access token

**See [`GOOGLE_OAUTH_INTEGRATION.md`](./GOOGLE_OAUTH_INTEGRATION.md) for complete Google OAuth documentation.**

## 🔐 Authentication Flow

### Email/Password Registration
```javascript
POST /api/auth/signup
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+233241234567",
  "password": "SecurePass123!"
}
```

### Email/Password Login
```javascript
POST /api/auth/signin
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Google OAuth (SSR with PKCE)

**Quick Start:** See [`GOOGLE_OAUTH_QUICKSTART.md`](./GOOGLE_OAUTH_QUICKSTART.md) for integration guide.

**Full Documentation:** See [`GOOGLE_OAUTH_INTEGRATION.md`](./GOOGLE_OAUTH_INTEGRATION.md) for complete architecture and API reference.

The backend uses **Server-Side Rendering (SSR) OAuth flow with PKCE** for Google authentication:

1. **Initiate OAuth:** `GET /api/auth/google?redirectTo=/dashboard`
   - Returns OAuth URL for frontend to open in popup
   - Stores PKCE code verifier in HttpOnly cookie

2. **OAuth Callback:** `GET /api/auth/google/callback?code=...`
   - Handled automatically by backend
   - Exchanges code for session using PKCE
   - Creates/updates user profile
   - Returns session to frontend via postMessage

**Frontend Flow:**
```javascript
// 1. Get OAuth URL
const response = await fetch('/api/auth/google?redirectTo=/dashboard', {
  credentials: 'include' // Important for cookies
})
const { url } = await response.json()

// 2. Open popup
const popup = window.open(url, 'Google Auth', 'width=500,height=600')

// 3. Listen for postMessage
window.addEventListener('message', (event) => {
  if (event.data.type === 'grovio:google-auth' && event.data.success) {
    const { session, user } = event.data.data
    // Store session and redirect
  }
})
```

For complete frontend integration examples, see the documentation files above.

### Protected Routes
Add `Authorization: Bearer <token>` header to access protected routes.

## 🛡️ Security Features

- **Password Hashing** with bcrypt (12 rounds)
- **JWT Authentication** via Supabase
- **Input Validation** with express-validator
- **Rate Limiting** (100 requests per 15 minutes)
- **CORS Protection** for specific origins
- **Helmet** for security headers
- **Row Level Security** in database

## 🏗️ Architecture Patterns

### Controller Pattern
Controllers handle HTTP requests and delegate to services:

```typescript
export class AuthController {
  signup = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.signUp(req.body)
    res.status(result.success ? 201 : 400).json(result)
  }
}
```

### Service Pattern
Services contain business logic:

```typescript
export class AuthService {
  async signUp(signupData: SignupRequest): Promise<AuthResponse> {
    // Validation, password hashing, database operations
  }
}
```

### Middleware Pattern
Middleware for cross-cutting concerns:

```typescript
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // JWT verification logic
}
```

## 🚢 Deployment

### Railway Deployment

1. **Connect Repository**: Link your GitHub repo to Railway
2. **Environment Variables**: Add all env vars in Railway dashboard
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`
5. **Port**: Railway automatically sets `PORT` env variable

### Production Environment Variables

```env
NODE_ENV=production
PORT=5000
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_production_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
JWT_SECRET=your_strong_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_URL=https://your-admin-domain.com
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. **Create Service**: Add business logic in `src/services/`
2. **Create Controller**: Add HTTP handlers in `src/controllers/`
3. **Create Routes**: Add route definitions in `src/routes/`
4. **Add Middleware**: Add validation/auth in `src/middleware/`
5. **Update Types**: Add TypeScript types in `src/types/`

### Example: Adding Products API

```typescript
// src/services/product.service.ts
export class ProductService {
  async getAllProducts() { /* logic */ }
}

// src/controllers/product.controller.ts
export class ProductController {
  getProducts = async (req: Request, res: Response) => { /* handler */ }
}

// src/routes/product.routes.ts
router.get('/products', asyncHandler(productController.getProducts))

// src/server.ts
app.use('/api/products', productRoutes)
```

## API Response Format

All endpoints return consistent JSON responses:

```typescript
// Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "user": { /* user object if applicable */ }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"]
}
```

## Monitoring & Logging

- **Morgan** for HTTP request logging
- **Console logging** for errors and debugging
- **Health endpoints** for uptime monitoring
- **Database connectivity** checks

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add proper TypeScript types
3. Include input validation for new endpoints
4. Add error handling with try-catch blocks
5. Update this README for new features

---

**Ready to build!** This backend server provides a solid foundation for your Grovio platform with proper separation of concerns and scalable architecture.