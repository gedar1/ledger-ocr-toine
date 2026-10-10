---
inclusion: always
---

# Next.js standards

Apply these standards to all application changes. Preserve the existing product intent: a Spanish-language expense tracker with OCR/AI-assisted receipt processing and accountant/client workflows.

## Framework and project structure

- Use the Next.js 16 version installed in this repository. Do not rely on remembered APIs or conventions: before changing framework behavior, consult the relevant guide under `node_modules/next/dist/docs/`.
- Use the App Router exclusively. Put routes under `src/app`; do not add a legacy `pages/` directory.
- Use standard route files when they improve the route UX or isolation: `page.tsx`, `layout.tsx`, `loading.tsx`, and `error.tsx`. They are not required for every segment.
- Keep `AGENTS.md`'s generated Next.js guidance intact; `next dev` may recreate that block.
- Keep the root layout responsible for document metadata, `lang`, global CSS, fonts, and application-wide providers. Avoid duplicating those concerns in individual pages.

## Rendering and component boundaries

- Prefer React Server Components. Fetch data and perform server-only work in Server Components or server-side modules.
- Add `'use client'` only when a component needs browser APIs, event handlers, interactive state, or client-only libraries. Keep client boundaries as close to the leaves as practical.
- Never expose secrets, database clients, service credentials, or privileged OCR/AI operations to client bundles.
- Choose static, dynamic, or revalidated rendering based on data freshness and user-specific content; do not make every route dynamic by default.

## Backend and data access

- Implement HTTP endpoints as Route Handlers at `src/app/api/**/route.ts`. Keep handlers thin: authenticate and validate input, call domain logic, and map outcomes to consistent HTTP responses.
- Access PostgreSQL through Prisma. Reuse the shared Prisma client in `src/lib/prisma.ts`; do not instantiate a new client per request or inside UI components.
- When business logic grows beyond a handler or component, move it into a server-only service/module with explicit input and output types. Keep OCR, AI, uploads, categorization, and database logic out of presentation code.
- Validate untrusted form, query, route, and uploaded-file input at the boundary. Return appropriate status codes and safe error messages; log diagnostic details only on the server.
- Keep authentication and session behavior aligned with the existing NextAuth setup. Enforce authorization on the server for accountant/client data and mutations.

## TypeScript and code quality

- Follow the strict TypeScript configuration. Do not use `any`; define types for component props, domain objects, API payloads, and API responses. Prefer narrowing, discriminated unions, or `unknown` over unsafe casts.
- Use the `@/*` alias for imports from `src` instead of long relative paths. Use type-only imports where appropriate.
- Run and satisfy the repository's ESLint configuration (`eslint-config-next` Core Web Vitals and TypeScript rules). Keep modules focused and avoid duplicated business rules.
- Preserve stable response shapes and explicit error handling when extending existing APIs. Do not silently change field names or status semantics used by callers.

## UI, styling, and product conventions

- Use Tailwind CSS v4 through the existing `@tailwindcss/postcss` setup and `src/app/globals.css`. Do not introduce a second styling system without a clear project-level reason.
- Reuse the root `next/font` setup and existing theme conventions. Ensure responsive and dark-mode states remain usable when changing shared UI.
- Use `next/image` for optimized images with meaningful `alt` text and required sizing behavior. Use `next/link` for internal navigation; use normal anchors for external destinations.
- Keep user-facing copy and domain terminology consistent with the existing Spanish expense/OCR experience. Do not expose raw provider errors or English placeholder copy in production UI.
- Make forms, review flows, upload states, loading states, empty states, and errors explicit and accessible. Preserve keyboard access, labels, and useful feedback for OCR results requiring user review.

## Validation

- For application changes, run `npm run lint` and `npm run build` before considering the work complete. Use `npx tsc --noEmit` when type-only verification is useful.
- For database changes, review the Prisma schema and migration workflow, then run the appropriate Prisma generation and local database checks. Treat reset operations as destructive and local-development-only.
- There is currently no repository test script; do not claim tests passed when only lint or build was run. Report any validation that could not be performed.
