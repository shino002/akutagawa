---
name: project-structure
description: Defines the folder structure and file placement conventions for this Next.js + Firebase + R2 project. Use when creating new files, splitting large components, refactoring page.tsx, deciding where code should live, or reviewing the project structure.
---

# Project Structure

This project uses Next.js App Router. The goal is to keep route files (`page.tsx`, `layout.tsx`) thin and push logic into well-defined folders **at the project root**. There is no route-scoped colocation — every shared concern lives at the root.

## Top-level Layout

```
components/          # All React components (cross-route AND single-route)
hooks/               # All React hooks
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
│   └── page.tsx     # Thin: composes components + hooks
├── layout.tsx       # Wraps children with root providers
├── page.tsx         # Thin: composes components + hooks
└── globals.css

public/              # Static assets
```

**Create folders lazily.** Folders like `schemas/`, `constants/`, `contexts/` only need to exist once there's a real file to put there. Don't create empty folders just to match this layout.

**Why everything lives at the project root:** Next.js App Router treats every folder under `app/` as a route. Keeping all shared concerns outside `app/` removes any risk of accidental route creation and keeps the route boundary explicit. Components used by only one route still live in root `components/` — organize by domain via subfolders (e.g. `components/home/`, `components/admin/`) if needed, not by route colocation.

**No `apis/` folder:** Client-side data fetching calls Next.js API routes (`/api/...`) directly inside hooks. Don't introduce a separate client API client layer until there's a concrete reason.

## Where Does This File Go?

```
Is it a React component?                → components/
Is it a React hook (useXxx)?
├── Used by exactly ONE component?      → colocate inline in that component file
└── Reusable / data-fetching / shared?  → hooks/
Is it a React Context Provider?         → providers/
                                          (and the Context object itself → contexts/)
Is it a TypeScript type/interface?
├── Used by ONE file?                   → keep inline in that file
└── Shared across files?                → types/
Is it an app-wide constant?             → constants/
Is it a validation schema?              → schemas/
Is it a pure utility (no React, no I/O)?→ utils/
Is it a server-only API handler?        → app/api/<endpoint>/route.ts
Is it server-only logic shared by
multiple API routes?                    → lib/
```

If a folder grows large, organize by domain (e.g. `components/home/SideMenu.tsx`, `components/admin/Editor.tsx`).

**Colocate single-use hooks.** When a custom hook is used by exactly one component (e.g. `useCalendar` only used by `CalendarWidget`), define it in the same file as the component rather than in `hooks/`. Move it out to `hooks/` only when a second consumer appears. This keeps `hooks/` reserved for reusable / cross-component logic.

## Data Fetching: External Store Pattern

For Firestore subscriptions (and any other long-lived external subscription), use the **`useSyncExternalStore` + module-level singleton store** pattern instead of `useEffect` + `useState`.

**Pattern (see `hooks/useCharacters.ts` etc.):**

```ts
"use client";

let state: State = EMPTY;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) startFirestoreSubscription();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopFirestoreSubscription();
  };
};

export const useThing = () =>
  useSyncExternalStore(subscribe, () => state, () => EMPTY);
```

**Why:**

- **Cost.** Multiple components reading the same collection share a single `onSnapshot` subscription. Firestore is billed per read.
- **No `useEffect`.** Avoids the `react-hooks/set-state-in-effect` and `react-hooks/refs` headaches that come with the React 19 lint ruleset.
- **React-recommended.** `useSyncExternalStore` is the official hook for subscribing to external mutable stores.
- **SSR-safe.** `getServerSnapshot` returns an empty state so server rendering doesn't try to read Firestore.

**Hook return shape:** `{ data, error }` (or `{ content, error }` for document stores). Errors are part of the snapshot, not pushed via callback — callers can derive a display string at render time.

Pure UI state hooks (forms, modals, local toggles) keep using `useState` — this pattern is only for **subscriptions to external systems**.

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
- Inside `app/` route files, also use the `@/` alias for all non-relative-sibling imports. Reserve relative imports for sibling files within the same folder only.

## Splitting Workflow

When a `page.tsx` exceeds ~200 lines, split in this order:

1. **Extract types** → `types/` (or keep inline if single-use)
2. **Extract data-fetching hooks** → `hooks/` (e.g., `useWorks`)
   - The hook owns the `fetch('/api/...')` call internally
3. **Extract leaf components** (no state) → `components/`
4. **Extract container components** (with state) → `components/`
5. **Verify** `page.tsx` is back to composition only

After each extraction, run `pnpm exec eslint --fix <files>` and `pnpm exec prettier --write <files>` on changed files only (per `editing-conventions.mdc`).

## Anti-Patterns

- ❌ Defining types, hooks, or components inline in `page.tsx`
- ❌ Putting shared code under `app/` (including underscore-prefixed folders like `app/_components/`)
- ❌ Putting React code in `lib/` (lib is for server-only or framework-agnostic code)
- ❌ Creating an `apis/` or `services/` folder — call `/api/...` directly from hooks
- ❌ Using folder names like `helpers/`, `common/`, `shared/` — prefer the categorized folders above
