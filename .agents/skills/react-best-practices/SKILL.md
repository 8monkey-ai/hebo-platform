---
name: react-best-practices
description: React performance optimization guidelines adapted from Vercel Engineering. Use when writing, reviewing, or refactoring React components, data fetching, bundle optimization, or performance improvements in the console app.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
  adapted: true
---

# React Best Practices

Performance optimization guide for React applications, based on Vercel Engineering's published best practices. Contains 62 rules across 8 categories, prioritized by impact.

Adapted for this project's stack: React Router 7 (Framework mode), Tailwind 4, Valtio, and React Compiler.

## Project-Specific Overrides

- **React Compiler is enabled.** Do NOT use `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization automatically. Skip rules `rerender-memo`, `rerender-memo-with-default-value`, and `rerender-simple-expression-in-memo`.
- **This project uses React Router, not Next.js.** Skip Next.js-specific rules (`server-cache-react`, `server-dedup-props`, `server-serialization`, `server-parallel-fetching`, `server-after-nonblocking`, `server-hoist-static-io`, `bundle-dynamic-imports` using `next/dynamic`). Use React Router equivalents (e.g. `React.lazy` + `Suspense` for code splitting, `clientLoader` for data loading).
- **Valtio for client state.** Valtio uses proxies for fine-grained reactivity — most `rerender-derived-state` and `rerender-defer-reads` patterns are handled by Valtio's `useSnapshot`.

## When to Apply

Reference these guidelines when:
- Writing new React components or route modules
- Implementing data fetching in `clientLoader` or `clientAction`
- Reviewing code for performance issues
- Refactoring existing React code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-` |
| 3 | Client-Side Data Fetching | MEDIUM-HIGH | `client-` |
| 4 | Re-render Optimization | MEDIUM | `rerender-` |
| 5 | Rendering Performance | MEDIUM | `rendering-` |
| 6 | JavaScript Performance | LOW-MEDIUM | `js-` |
| 7 | Advanced Patterns | LOW | `advanced-` |

## Applicable Rules (Quick Reference)

### 1. Eliminating Waterfalls (CRITICAL)

- `async-defer-await` - Move await into branches where actually used
- `async-parallel` - Use Promise.all() for independent operations
- `async-dependencies` - Use better-all for partial dependencies
- `async-suspense-boundaries` - Use Suspense to stream content

### 2. Bundle Size Optimization (CRITICAL)

- `bundle-barrel-imports` - Import directly, avoid barrel files
- `bundle-defer-third-party` - Load analytics/logging after hydration
- `bundle-conditional` - Load modules only when feature is activated
- `bundle-preload` - Preload on hover/focus for perceived speed

### 3. Client-Side Data Fetching (MEDIUM-HIGH)

- `client-event-listeners` - Deduplicate global event listeners
- `client-passive-event-listeners` - Use passive listeners for scroll
- `client-localstorage-schema` - Version and minimize localStorage data

### 4. Re-render Optimization (MEDIUM)

- `rerender-derived-state-no-effect` - Derive state during render, not effects
- `rerender-functional-setstate` - Use functional setState for stable callbacks
- `rerender-lazy-state-init` - Pass function to useState for expensive values
- `rerender-move-effect-to-event` - Put interaction logic in event handlers
- `rerender-transitions` - Use startTransition for non-urgent updates
- `rerender-use-ref-transient-values` - Use refs for transient frequent values
- `rerender-no-inline-components` - Don't define components inside components
- `rerender-dependencies` - Use primitive dependencies in effects

### 5. Rendering Performance (MEDIUM)

- `rendering-content-visibility` - Use content-visibility for long lists
- `rendering-hoist-jsx` - Extract static JSX outside components
- `rendering-conditional-render` - Use ternary, not && for conditionals
- `rendering-usetransition-loading` - Prefer useTransition for loading state

### 6. JavaScript Performance (LOW-MEDIUM)

- `js-batch-dom-css` - Group CSS changes via classes or cssText
- `js-index-maps` - Build Map for repeated lookups
- `js-cache-property-access` - Cache object properties in loops
- `js-combine-iterations` - Combine multiple filter/map into one loop
- `js-early-exit` - Return early from functions
- `js-hoist-regexp` - Hoist RegExp creation outside loops
- `js-set-map-lookups` - Use Set/Map for O(1) lookups
- `js-flatmap-filter` - Use flatMap to map and filter in one pass

### 7. Advanced Patterns (LOW)

- `advanced-init-once` - Initialize app once per app load

## Full Reference

For detailed explanations and code examples for all rules, see `references/AGENTS.md`.
