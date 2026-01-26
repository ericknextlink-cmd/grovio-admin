import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const possibleEnvPaths = [
  resolve(__dirname, '../../.env.local'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env.local'),
  resolve(__dirname, '../../../.env'),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
]

let envLoaded = false
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('No .env file found. Using system environment variables only.')
}
