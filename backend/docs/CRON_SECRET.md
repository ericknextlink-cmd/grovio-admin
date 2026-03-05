# CRON_SECRET

Used to protect the **scheduled order reminders** cron endpoint so only your scheduler (e.g. cron job, GitHub Actions, Vercel Cron) can call it.

## Where to set it

1. **Backend environment**  
   Add to your backend `.env` (and to your host’s env vars, e.g. Railway, Render):

   ```env
   CRON_SECRET=your-generated-secret-here
   ```

2. **Cron caller**  
   Send the same value when calling the endpoint:

   - **Header (recommended):** `x-cron-secret: your-generated-secret-here`
   - **Body (alternative):** `{ "cron_secret": "your-generated-secret-here" }`

   Example:

   ```bash
   curl -X POST "https://your-api.example.com/api/scheduled-orders/run-reminders" \
     -H "x-cron-secret: YOUR_CRON_SECRET"
   ```

If `CRON_SECRET` is **not** set in the backend, the endpoint does not require a secret (useful for local/dev).

## How to generate a unique value

**Option 1 – OpenSSL (recommended)**

```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6...` (64 hex characters). Use this as `CRON_SECRET`.

**Option 2 – Node**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a long, random value and keep it secret (same as any API key).
