import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

// Try to find .env file in multiple locations
const possibleEnvPaths = [
  resolve(__dirname, '../../.env.local'),     // backend/.env.local
  resolve(__dirname, '../../.env'),           // backend/.env
  resolve(__dirname, '../../../.env.local'),  // parent dir .env.local
  resolve(__dirname, '../../../.env'),        // parent dir .env
  resolve(process.cwd(), '.env.local'),       // cwd .env.local
  resolve(process.cwd(), '.env'),             // cwd .env
]

let envLoaded = false
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    // console.log(`📦 Loading environment variables from: ${envPath}`)
    loadEnv({ path: envPath })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found. Using system environment variables only.')
}
