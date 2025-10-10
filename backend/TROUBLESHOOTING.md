# Backend Troubleshooting Guide

## Common Issues and Solutions

### 1. TypeScript File Extension Error

**Error:**
```
TypeError: Unknown file extension ".ts" for src/server.ts
```

**Solutions (try in order):**

#### Option A: Use the updated nodemon config
```bash
npm run dev
```

#### Option B: Use direct ts-node execution
```bash
npm run dev:ts
```

#### Option C: Manual ts-node execution
```bash
npx ts-node --transpile-only src/server.ts
```

#### Option D: Reinstall ts-node
```bash
npm install --save-dev ts-node@^10.9.2
npm run dev
```

### 2. Missing Dependencies

**Error:**
```
Cannot find module 'helmet' or 'express-rate-limit'
```

**Solution:**
Run the dependency installation script:

**Windows:**
```bash
install-deps.bat
```

**macOS/Linux:**
```bash
chmod +x install-deps.sh
./install-deps.sh
```

### 3. Environment Variables Not Found

**Error:**
```
Missing Supabase environment variables
```

**Solution:**

**Step 1: Create the environment file**

Windows:
```bash
create-env.bat
```

macOS/Linux:
```bash
chmod +x create-env.sh
./create-env.sh
```

**Step 2: Verify the file was created**
Check that `.env.local` exists in your backend directory and contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tophzoixrwfugwnewmoh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 3: Add your service role key**
Get your `SUPABASE_SERVICE_ROLE_KEY` from:
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the anon key)
4. Replace `your_service_role_key_here` in your `.env.local`

**Step 4: Restart the server**
```bash
npm run dev
```

### 4. Port Already in Use

**Error:**
```
EADDRINUSE: address already in use :::5000
```

**Solution:**
Change the port in your `.env.local`:
```env
PORT=3001
```

### 5. Supabase Connection Issues

**Error:**
```
Failed to connect to Supabase
```

**Solutions:**
1. Verify your Supabase URL and keys are correct
2. Check your internet connection
3. Ensure your Supabase project is active
4. Run the database schema setup

### 6. TypeScript Compilation Errors

**Error:**
```
Type errors in source files
```

**Solution:**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Fix common issues
npm install --save-dev @types/node @types/express
```

## Quick Fixes

### Reset Everything
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use yarn
rm -rf node_modules yarn.lock
yarn install
```

### Alternative Start Methods

If `npm run dev` doesn't work, try these alternatives:

```bash
# Method 1: Direct nodemon
npx nodemon --exec "ts-node --transpile-only" src/server.ts

# Method 2: Compile then run
npm run build
npm start

# Method 3: Direct ts-node
npx ts-node src/server.ts
```

## Development Environment

### Recommended Node.js Version
- Node.js 18.x or higher
- npm 9.x or higher

### Check Your Environment
```bash
node --version
npm --version
npx ts-node --version
```

## Still Having Issues?

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Check for global conflicts:**
   ```bash
   npm list -g --depth=0
   ```

3. **Try with yarn instead of npm:**
   ```bash
   yarn install
   yarn dev
   ```

4. **Enable verbose logging:**
   ```bash
   DEBUG=* npm run dev
   ```

## Success Indicators

When the server starts successfully, you should see:
```
🚀 Grovio Backend Server running on port 5000
📝 Environment: development
🌐 Frontend URL: http://localhost:3001
⚡ Admin URL: http://localhost:3000
```

You can then test the health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Grovio Backend Server is running",
  "timestamp": "2024-01-20T10:00:00Z"
}
```
