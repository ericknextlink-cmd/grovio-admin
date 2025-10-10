# Grovio Backend Setup Guide

## Quick Setup

### 1. Environment Variables
Create a `.env.local` file in the backend directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tophzoixrwfugwnewmoh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcGh6b2l4cndmdWd3bmV3bW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjY1NDUsImV4cCI6MjA3NDQwMjU0NX0.GyEWaVlJvTyn3oqaNH4RX926TAgDk16v9DAeDLeN_5I
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000
```

### 2. Install Dependencies

**Option A: Using npm**
```bash
npm install
```

**Option B: Using the setup script**
```bash
# Windows
install-deps.bat

# macOS/Linux
chmod +x install-deps.sh
./install-deps.sh
```

### 3. Database Setup
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `src/database/schema.sql`
4. Run the SQL commands

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Troubleshooting

### TypeScript Errors
If you encounter TypeScript errors, make sure all dependencies are installed:

```bash
npm install helmet express-rate-limit dotenv express-validator
npm install --save-dev @types/express-rate-limit
```

### Missing Environment Variables
Make sure your `.env.local` file contains all required variables. Check the `env.example` file for reference.

### Database Connection Issues
1. Verify your Supabase URL and keys are correct
2. Check that the database schema has been created
3. Ensure your Supabase project is active

### Port Already in Use
If port 5000 is already in use, change the PORT in your `.env.local` file:
```env
PORT=3001
```

## API Testing

Once the server is running, you can test the health endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Grovio Backend Server is running",
  "timestamp": "2024-01-20T10:00:00Z",
  "uptime": "1m 30s",
  "version": "1.0.0",
  "environment": "development"
}
```

## Next Steps

1. **Configure Google OAuth**: Set up Google Cloud Console credentials
2. **Set up email templates**: Configure Supabase email templates for verification
3. **Test API endpoints**: Use the API documentation to test all endpoints
4. **Deploy to Railway**: Follow the deployment guide for production

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure the database schema is properly created
4. Check that all dependencies are installed

For API documentation, see `API_DOCUMENTATION.md`.
