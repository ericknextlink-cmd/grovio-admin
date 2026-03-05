# AI Chat Page – Threads, History & DB

The **AI chat page** (`/ai-chat` on the frontend) is the main place for agent chats: sidebar for history, new chats, and full-screen chat with thread-based context.

## What’s implemented

### Frontend (`/ai-chat`)

- **Sidebar (conversation history)**
  - “Conversations” header and “New Conversation” button.
  - List of threads (when signed in): click to open, trash to delete.
  - **Mobile:** Sidebar is a slide-out; menu button in the header opens it.
- **Main area**
  - Messages for the current thread (or new conversation).
  - Product recommendations when the AI returns them.
  - Input at the bottom; send uses the current thread (or creates one).
- **Responsive**
  - Desktop: sidebar always visible (static).
  - Mobile: sidebar hidden by default, toggled via menu; main area full width.

### Backend (thread-aware chat)

- **POST /api/ai/chat** (optional auth)
  - Body: `message`, optional `threadId`, optional `role`, `familySize`, etc.
  - If `threadId` is omitted or null → create a new thread (UUID).
  - Loads last N messages for that thread from DB, passes them to the model as context (LangChain-style history).
  - Appends user + assistant messages to the thread and returns `threadId` in the response.
- **GET /api/ai/threads** (auth required)
  - Returns the current user’s threads (for sidebar).
- **GET /api/ai/threads/:threadId** (auth required)
  - Returns one thread’s messages (for “visit old chat”).
- **DELETE /api/ai/threads/:threadId** (auth required)
  - Deletes that thread.

### DB and context

- **Table:** `ai_conversation_threads`
  - `thread_id` (UUID, PK), `user_id`, `messages` (JSONB array), `context` (JSONB), `created_at`, `updated_at`.
- **Thread ID = context tracking**
  - Each conversation has a stable `thread_id` (UUID). The backend uses it to:
    - Load history for that thread.
    - Append new user/assistant messages.
  - So “thread” here is the same idea as a LangChain thread: one ID per conversation, used to store and retrieve context.

### One-time setup

1. **Create the table**  
   Run `supabase-ai-conversation-threads.sql` in the Supabase SQL editor so `ai_conversation_threads` exists.
2. **Frontend API base**  
   Ensure the frontend’s `NEXT_PUBLIC_API_URL` (or your proxy) points at the backend so `/api/ai/chat` and `/api/ai/threads*` hit this backend.

After that, the chat page, sidebar, history, “new chat”, “visit old chat”, and DB-backed thread context are all wired end-to-end.
