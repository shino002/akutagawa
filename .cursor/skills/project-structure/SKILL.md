---
name: project-structure
description: Defines the folder structure and file placement conventions for this Next.js + Firebase + R2 project. Use when creating new files, splitting large components, refactoring page.tsx, deciding where code should live, or reviewing the project structure.
---

# Project Structure

This project uses Next.js App Router. The goal is to keep route files (`page.tsx`, `layout.tsx`) thin and push logic into well-defined folders **at the project root**.

## Top-level Layout

```
components/          # Shared React components (cross-route)
hooks/               # Shared React hooks
providers/           # React Context providers (Auth, Theme, etc.)
contexts/            # React Context objects + their types (consumed by providers)
types/               # Shared TypeScript types/interfaces
constants/           # App-wide constants (enums, config values, magic strings)
schemas/             # Validation schemas (zod, etc.) — add when introduced
utils/               # Pure helper functions (no React, no I/O)
lib/                 # Server-only or SDK init code
├── firebase.ts      # Firebase SDK init
├── auth-helpers.ts  # Server-side auth verification
└── image-helpers.ts # Pure helpers used on the server

app/                 # Next.js App Router — routes only
├── api/             # Server-side API route handlers
│   ├── r2-upload/route.ts
│   └── r2-delete/route.ts
├── admin/
│   ├── page.tsx     # Thin: composes components + hooks
│   └── _components/ # Route-scoped (admin only) — underscore required
├── layout.tsx       # Wraps children with root providers
├── page.tsx         # Thin: composes components + hooks
└── globals.css

public/              # Static assets
```

**Create folders lazily.** Folders like `schemas/`, `constants/`, `contexts/` only need to exist once there's a real file to put there. Don't create empty folders just to match this layout.

**Why shared folders live at the project root:** Next.js App Router treats every folder under `app/` as a route. Keeping `components/`, `hooks/`, etc. outside `app/` removes any risk of accidental route creation and makes the route boundary explicit.

**Why route-scoped folders use `_` prefix:** When a component is only used by one route, colocate it under that route (e.g. `app/admin/_components/Editor.tsx`). The underscore marks the folder as private so Next.js excludes it from routing.

**No `apis/` folder:** Client-side data fetching calls Next.js API routes (`/api/...`) directly inside hooks. Don't introduce a separate client API client layer until there's a concrete reason.

## Where Does This File Go?

```
Is it a React component?
├── Used by ONE route only?     → app/<route>/_components/
└── Used by MULTIPLE routes?    → components/

Is it a React hook (useXxx)?
├── Used by ONE route only?     → app/<route>/_hooks/
└── Used by MULTIPLE routes?    → hooks/

Is it a React Context Provider?
                                → providers/
                                  (and the Context object itself → contexts/)

Is it a TypeScript type/interface?
├── Used by ONE file?           → keep inline in that file
├── Used by ONE route only?     → app/<route>/_types/
└── Used by MULTIPLE routes?    → types/

Is it an app-wide constant (enum, config value, magic string)?
                                → constants/

Is it a validation schema (zod, yup, etc.)?
                                → schemas/

Is it a pure utility (no React, no I/O)?
                                → utils/

Is it a server-only API handler (called via HTTP)?
                                → app/api/<endpoint>/route.ts

Is it server-only logic shared by multiple API routes (SDK init,
auth verification, server-side helpers)?
                                → lib/
```

## File Naming

| Kind | Convention | Example |
|------|------------|---------|
| Component file | `PascalCase.tsx` | `BgmPlayer.tsx` |
| Hook file | `camelCase.ts`, starts with `use` | `useScrollLock.ts` |
| Provider file | `PascalCase.tsx`, ends with `Provider` | `AuthProvider.tsx` |
| Context file | `PascalCase.ts`, ends with `Context` | `AuthContext.ts` |
| Types file | `camelCase.ts`, ends with `.types.ts` | `work.types.ts` |
| Constants file | `camelCase.ts` | `routes.ts`, `errorCodes.ts` |
| Schema file | `camelCase.ts`, ends with `.schema.ts` | `work.schema.ts` |
| Utility file | `camelCase.ts` | `formatDate.ts` |
| Route file | Next.js reserved | `page.tsx`, `layout.tsx`, `route.ts` |

## Page Files Stay Thin

`page.tsx` and `layout.tsx` should be **composition only**. They import components, hooks, and types — they don't define them inline.

**Bad** (current state of `app/page.tsx` — 83KB):

```tsx
export default function HomePage() {
  const [items, setItems] = useState([]);
  useEffect(() => { /* 200 lines of fetch + parse */ }, []);
  const handleClick = () => { /* 50 lines */ };
  return (
    <div>
      {/* 1500 lines of JSX with inline styles and handlers */}
    </div>
  );
}
```

**Good**:

```tsx
import { WorkList } from "@/components/WorkList";
import { useWorks } from "@/hooks/useWorks";

export default function HomePage() {
  const { works, loading } = useWorks();
  return <WorkList works={works} loading={loading} />;
}
```

A `page.tsx` over ~100 lines is a signal to split.

## Import Path Rules

- Use the `@/` alias (configured in `tsconfig.json`) for cross-folder imports.
  - ✅ `import { useWorks } from "@/hooks/useWorks";`
  - ✅ `import { WorkList } from "@/components/WorkList";`
  - ❌ `import { useWorks } from "../../../hooks/useWorks";`
- Use relative imports only within the same route folder.
  - ✅ Inside `app/admin/page.tsx`: `import { Editor } from "./_components/Editor";`

## Splitting Workflow

When a `page.tsx` exceeds ~200 lines, split in this order:

1. **Extract types** → `types/` (or inline if single-use)
2. **Extract data-fetching hooks** → `hooks/` (e.g., `useWorks`)
   - The hook owns the `fetch('/api/...')` call internally
3. **Extract leaf components** (no state) → `components/`
4. **Extract container components** (with state) → `components/`
5. **Verify** `page.tsx` is back to composition only

If a piece is only used by one route, put it under `app/<route>/_components/` (or `_hooks/`, `_types/`) instead of the root folder.

After each extraction, run `pnpm exec eslint --fix <files>` and `pnpm exec prettier --write <files>` on changed files only (per `editing-conventions.mdc`).

## Migration Note

The existing `app/components/` folder should be moved to `components/` at the project root. After moving, update imports across the codebase to use the `@/components/...` alias.

## Anti-Patterns

- ❌ Defining types, hooks, or components inline in `page.tsx`
- ❌ Putting shared (cross-route) code under `app/`
- ❌ Putting route-specific code in the root `components/` folder (use `app/<route>/_components/` instead)
- ❌ Putting React code in `lib/` (lib is for server-only or framework-agnostic code)
- ❌ Creating an `apis/` or `services/` folder — call `/api/...` directly from hooks
- ❌ Using folder names like `helpers/`, `common/`, `shared/` — prefer the categorized folders above
