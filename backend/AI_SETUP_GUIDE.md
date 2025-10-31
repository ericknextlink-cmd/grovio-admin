# 🚀 AI System Setup Guide

Complete guide to setup and use the enhanced AI recommendation system.

---

## 📋 Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

**New dependencies added:**
- `@langchain/openai` - OpenAI integration
- `@langchain/core` - Core Langchain functionality
- `@langchain/community` - Community tools
- `langchain` - Main framework
- `openai` - OpenAI SDK

### Step 2: Configure Environment

Add to `backend/.env`:

```bash
# OpenAI API Key (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Existing Supabase config (already have these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Get OpenAI API Key:**
1. Visit https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to `.env` file

### Step 3: Setup Database

Run this SQL in Supabase SQL Editor:

```sql
-- File: backend/src/database/ai-schema.sql
-- Copy the entire file and run it
```

**Or manually:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `backend/src/database/ai-schema.sql`
3. Run the query
4. Verify tables created: `ai_conversation_threads`, `ai_recommendations`

### Step 4: Start Server

```bash
cd backend
npm run dev
```

Look for:
```
✅ 🚀 Grovio Backend Server running on port 3000
✅ No errors about missing OPENAI_API_KEY
```

### Step 5: Test AI Endpoints

```bash
# Test chat
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need groceries for 100 cedis",
    "familySize": 4
  }'

# Should return AI-generated recommendation with threadId
```

---

## 🎯 What's New

### Enhanced Features

#### 1. Database RAG Integration
```
Old: Static product list (30 products)
New: Real-time database queries (all products)

Benefits:
✅ Always up-to-date
✅ Accurate stock levels
✅ Real prices
✅ All products available
```

#### 2. Thread Continuity
```
Old: No conversation memory
New: Thread-based conversations with full history

Benefits:
✅ Context awareness
✅ Multi-turn conversations
✅ Better recommendations
✅ User can review history
```

#### 3. User Anonymization
```
Old: Exposed user IDs to AI
New: Anonymized identifiers only

Security:
✅ Real ID: 550e8400-e29b-41d4-a716-446655440000
✅ AI sees: anon_UU4ZSKAW
✅ Backend translates securely
✅ No PII exposure
```

#### 4. Intelligent Scoring
```
Old: Simple price sorting
New: Multi-factor scoring algorithm

Factors:
✅ Category priority (staples > proteins > others)
✅ User preferences (+5 points)
✅ Product ratings (+0.5 per star)
✅ Value scoring (cheap essentials boosted)
✅ Nutritional balance
✅ Category diversity
```

---

## 🔧 Configuration

### Environment Variables

```bash
# === REQUIRED FOR AI ===
OPENAI_API_KEY=sk-proj-...

# === EXISTING (ALREADY HAVE) ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# === OPTIONAL ===
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
PORT=3000
```

### Database Tables Required

```sql
✅ products              -- Product catalog (already exists)
✅ users                 -- User accounts (already exists)
✅ user_preferences      -- User settings (already exists)
✅ ai_conversation_threads  -- NEW: Conversation history
✅ ai_recommendations    -- NEW: Analytics tracking
```

---

## 📚 API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/ai/chat` | POST | Optional | Conversational AI with thread support |
| `/ai/recommendations` | POST | Optional | Intelligent product recommendations |
| `/ai/search` | GET | Optional | AI-powered product search |
| `/ai/budget-analysis` | POST | Optional | Budget insights and allocation |
| `/ai/meal-suggestions` | POST | Optional | Meal ideas with recipes |
| `/ai/threads/:id` | GET | Required | Get conversation history |
| `/ai/threads` | GET | Required | List all user threads |
| `/ai/threads/:id` | DELETE | Required | Delete conversation |

**Note:** All AI endpoints work for both authenticated and anonymous users!

---

## 🧪 Testing Checklist

### Basic Functionality

- [ ] Chat endpoint responds
  ```bash
  curl -X POST http://localhost:3000/api/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello"}'
  ```

- [ ] Recommendations work
  ```bash
  curl -X POST http://localhost:3000/api/ai/recommendations \
    -H "Content-Type: application/json" \
    -d '{"budget": 100, "familySize": 4}'
  ```

- [ ] Search works
  ```bash
  curl "http://localhost:3000/api/ai/search?query=rice&limit=5"
  ```

- [ ] Budget analysis works
  ```bash
  curl -X POST http://localhost:3000/api/ai/budget-analysis \
    -H "Content-Type: application/json" \
    -d '{"budget": 200, "familySize": 4, "duration": "week"}'
  ```

- [ ] Meal suggestions work
  ```bash
  curl -X POST http://localhost:3000/api/ai/meal-suggestions \
    -H "Content-Type: application/json" \
    -d '{"ingredients": ["rice", "chicken"], "mealType": "dinner", "familySize": 4}'
  ```

### Thread Functionality

- [ ] Thread created on first message
- [ ] Thread ID returned in response
- [ ] Subsequent messages remember context
- [ ] Can retrieve thread history (with auth)
- [ ] Can delete threads (with auth)

### Database Integration

- [ ] Products fetched from database
- [ ] User preferences applied
- [ ] Dietary restrictions respected
- [ ] Only in-stock products recommended

---

## 🎨 Frontend Integration

### Example: Chat Component

```typescript
'use client'

import { useState } from 'react'

export function AIChatWidget() {
  const [messages, setMessages] = useState([])
  const [threadId, setThreadId] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    setLoading(true)
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if available
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          message: input,
          threadId, // Include threadId for continuation
          familySize: 4,
          role: 'parent'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Save thread ID for next message
        if (data.data.threadId) {
          setThreadId(data.data.threadId)
        }

        // Add AI response
        const aiMessage = {
          role: 'assistant',
          content: data.data.message
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            <div dangerouslySetInnerHTML={{ __html: msg.content }} />
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Ask me about groceries..."
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
    </div>
  )
}
```

### Example: Get Recommendations

```typescript
const getRecommendations = async (budget: number, familySize: number) => {
  const response = await fetch('http://localhost:3000/api/ai/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}` // Optional
    },
    body: JSON.stringify({
      budget,
      familySize,
      role: 'parent',
      preferences: ['healthy', 'local'],
      categories: ['Rice & Grains', 'Vegetables']
    })
  })

  const { data } = await response.json()
  
  // Display recommendations
  data.items.forEach(item => {
    console.log(`${item.productName} x${item.quantity} - ₵${item.subtotal}`)
  })
  
  console.log(`Total: ₵${data.total}`)
  console.log(`Rationale: ${data.rationale}`)
}
```

---

## 🐛 Troubleshooting

### "AI service is not configured"

```bash
# Check .env file
cat backend/.env | grep OPENAI

# If missing, add it
echo "OPENAI_API_KEY=sk-your-key" >> backend/.env

# Restart server
npm run dev
```

### "No products available"

```bash
# Check database has products
# In Supabase SQL Editor:
SELECT COUNT(*) FROM products WHERE in_stock = true;

# Should return > 0
```

### "Thread not found"

```typescript
// Don't send threadId on first message
// ❌ Wrong
{ message: "Hello", threadId: "some-uuid" }

// ✅ Correct
// First message:
{ message: "Hello" }

// Second message (use threadId from response):
{ message: "I need rice", threadId: responseThreadId }
```

### Slow Responses

```bash
# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Reduce context if needed
# In ai-enhanced.service.ts, line 119:
const productContext = this.buildProductContext(products, 40) // Reduce from 80
```

---

## 📊 Performance Tips

### 1. Caching

```typescript
// Cache product catalog in memory (optional)
let productCache: Product[] | null = null
let cacheTime: number = 0

async getProducts() {
  const now = Date.now()
  if (productCache && (now - cacheTime) < 5 * 60 * 1000) {
    return productCache
  }
  
  productCache = await this.fetchFromDatabase()
  cacheTime = now
  return productCache
}
```

### 2. Model Selection

```typescript
// Fast & Cheap (Current)
model: "gpt-4o-mini"
Cost: ~$0.15/1M input tokens

// More Intelligent (Optional)
model: "gpt-4o"
Cost: ~$2.50/1M input tokens

// Ultra Fast (Future)
model: "gpt-3.5-turbo"
Cost: ~$0.50/1M input tokens
```

### 3. Context Optimization

```typescript
// Current: 60-80 products in context
// Optimization: Filter more aggressively

// Filter by budget range first
const affordableProducts = products.filter(p => p.price <= budget * 1.5)

// Then score and select top N
const topProducts = scoreProducts(affordableProducts).slice(0, 40)
```

---

## 🔒 Security Best Practices

### 1. Never Expose PII to AI

```typescript
// ❌ BAD
const prompt = `User ${user.email} with name ${user.firstName}...`

// ✅ GOOD
const prompt = `User ${anonymizeUserId(user.id)}...`
```

### 2. Validate All Inputs

```typescript
// Already implemented in routes
body('message').trim().isLength({ min: 1, max: 1000 })
body('budget').isFloat({ min: 1 })
body('threadId').optional().isUUID()
```

### 3. Rate Limiting

```typescript
// Add AI-specific rate limit
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many AI requests, please slow down'
})

app.use('/api/ai/', aiLimiter)
```

### 4. Cost Controls

```typescript
// Token limits
maxTokens: 1500 // Prevents runaway costs

// Fallback to deterministic
if (!OPENAI_API_KEY) {
  return deterministicRecommendation()
}
```

---

## 🎯 Migration from Old System

### What Changed

| Old (Frontend AI) | New (Backend AI) |
|-------------------|------------------|
| Static product list (30 items) | Database RAG (all products) |
| No conversation memory | Thread-based continuity |
| Groq (optional) | OpenAI (Langchain) |
| No user context | User preferences integrated |
| Simple filtering | Intelligent scoring algorithm |
| Frontend-only | Backend API with security |

### Migration Steps

1. ✅ **Dependencies** - Added Langchain packages
2. ✅ **Service** - Created `ai-enhanced.service.ts`
3. ✅ **Controller** - Updated `ai.controller.ts`
4. ✅ **Routes** - Enhanced `ai.routes.ts`
5. ✅ **Database** - Added thread tables
6. ✅ **Documentation** - Complete guides

**Old files (can be removed from frontend):**
- `AI/route.ts` → Now `backend/src/routes/ai.routes.ts`
- `AI/ai/langchain.ts` → Now part of `ai-enhanced.service.ts`
- `AI/ai/recommender.ts` → Enhanced in service
- `AI/products.ts` → Now from database

---

## 📖 Full Documentation

| File | Purpose |
|------|---------|
| `AI_SYSTEM_DOCUMENTATION.md` | Complete technical documentation |
| `AI_SETUP_GUIDE.md` | This file - setup instructions |
| `src/services/ai-enhanced.service.ts` | Service implementation |
| `src/controllers/ai.controller.ts` | API controllers |
| `src/routes/ai.routes.ts` | Route definitions |
| `src/database/ai-schema.sql` | Database schema |

---

## 🎉 You're Ready!

Your AI system is now:

✅ **Configured** - Using OpenAI with Langchain  
✅ **Secure** - User anonymization implemented  
✅ **Intelligent** - Enhanced recommendation algorithm  
✅ **Connected** - Database RAG integration  
✅ **Conversational** - Thread-based continuity  
✅ **Documented** - Complete guides available  

---

## 🚀 Next Steps

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Add OpenAI API key to .env**

3. **Run database migration:**
   ```sql
   -- In Supabase SQL Editor
   -- Copy from: src/database/ai-schema.sql
   ```

4. **Start server:**
   ```bash
   npm run dev
   ```

5. **Test endpoints** (see examples above)

6. **Integrate with frontend** (use example components)

---

**Questions?** See `AI_SYSTEM_DOCUMENTATION.md` for complete reference!

**Happy coding! 🚀**

