# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # Install deps + generate Prisma client + run migrations
npm run dev         # Start dev server at http://localhost:3000 (Turbopack)
npm run build       # Production build
npm run test        # Run all tests with vitest
npx vitest run src/path/to/file.test.ts  # Run a single test file
npm run db:reset    # Reset database (destructive)
npx prisma migrate dev  # Apply new schema changes
```

The dev server requires sourcing nvm first if node isn't on PATH:
```bash
\. "$HOME/.nvm/nvm.sh" && npm run dev
```

## Database

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

## Environment

- `ANTHROPIC_API_KEY` — optional. Without it, a `MockLanguageModel` is used that returns static canned responses. With it, uses `claude-haiku-4-5`.
- `JWT_SECRET` — optional. Defaults to `"development-secret-key"`.
- Database: SQLite at `prisma/dev.db`.

## Architecture

UIGen is an AI-powered React component generator. Users describe a component in chat; the AI writes files into a virtual filesystem; the preview renders those files live in an iframe.

### Request flow

1. User sends a chat message in `ChatInterface`
2. `useChat` (Vercel AI SDK) POSTs to `/api/chat/route.ts`
3. The API route calls `streamText` with two tools: `str_replace_editor` and `file_manager`
4. The AI uses those tools to create/edit files in a server-side `VirtualFileSystem`
5. Tool call results stream back to the client
6. `FileSystemContext` (`handleToolCall`) applies the same mutations to the client-side VFS
7. `PreviewFrame` detects VFS changes via `refreshTrigger` and re-renders the iframe
8. The iframe uses an in-browser Babel transform (`jsx-transformer.ts`) to run JSX directly

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` class. Holds files in-memory as a `Map<string, FileNode>`. Never writes to disk. Serializes to/from plain JSON for API transport and DB storage.

The AI always writes to a virtual FS rooted at `/`. Generated apps must have `/App.jsx` as the entry point. File imports inside generated code use the `@/` alias.

### AI Tools

- `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view/create/str_replace/insert operations on the VFS
- `file_manager` (`src/lib/tools/file-manager.ts`) — rename/delete operations on the VFS

The system prompt (`src/lib/prompts/generation.tsx`) instructs the model to always start with `/App.jsx`, use Tailwind for styling, and use `@/` for local imports.

### Preview rendering

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an iframe. On every VFS change, it calls `createPreviewHTML` which:
1. Transpiles all `.jsx`/`.tsx` files in the VFS with Babel standalone
2. Builds an ES module import map for React and other libraries
3. Injects the result into a sandboxed iframe as inline `<script type="module">`

### Auth

JWT-based, cookie-stored (`auth-token`). Implemented in `src/lib/auth.ts` using `jose`. Sessions last 7 days. Anonymous users can generate components but projects are only persisted for authenticated users. `src/middleware.ts` protects `/api/projects` and `/api/filesystem`.

### Data model

- `User` — email + bcrypt password
- `Project` — owned by optional User. `messages` (JSON string of chat history) and `data` (JSON string of serialized VFS) are stored as raw strings in SQLite.

### Key context providers

- `FileSystemContext` — owns the client-side VFS instance; exposes file CRUD and `handleToolCall` for applying AI tool results
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, passes VFS state to the API, and forwards tool calls to `FileSystemContext`
