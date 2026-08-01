# GEMINI.md

## NexBrix Development Guidelines

Follow these rules for every change made to the project.

## Code Standards

- Use **TypeScript** everywhere. Avoid JavaScript unless absolutely necessary.
- Prefer strict typing. Avoid `any`; use proper interfaces, types, or generics.
- Keep components and functions small, reusable, and readable.
- Follow the existing project structure and naming conventions.
- Remove unused imports, variables, functions, and dead code.
- Avoid duplicate code; extract reusable utilities/components when appropriate.

## React Best Practices

- **Never update state inside `useEffect` if it can be derived during render.**
- Avoid patterns like:

  ```tsx
  useEffect(() => {
    setData(computeData(props));
  }, [props]);
  ```

  Instead, derive the value directly or use `useMemo` when needed.

- Use `useEffect` only for synchronizing with external systems (API calls, subscriptions, timers, browser APIs, etc.).
- Calling `setState` synchronously inside an effect causes cascading renders and is not recommended.
- Keep hooks at the top level and follow the Rules of Hooks.
- Prefer server components where applicable. Add `"use client"` only when required.
- Memoize expensive computations with `useMemo` and callbacks passed to memoized children with `useCallback` only when there is a measurable benefit.

## UI & Design

- Follow the existing **NexBrix design system and color schema**.
- Reuse existing components before creating new ones.
- Keep the UI consistent, clean, and professional.
- Prioritize accessibility (semantic HTML, keyboard navigation, ARIA where needed).
- Ensure layouts are responsive across desktop, tablet, and mobile.

## Environment Variables

- **Never commit `.env` files.**
- Keep `.env.example` updated whenever a new environment variable is added, removed, or renamed.
- Do not hardcode secrets, API keys, tokens, or credentials.
- Validate required environment variables at startup.

## API & Backend

- Validate all external input.
- Handle loading, empty, and error states gracefully.
- Use consistent error handling and logging.
- Avoid unnecessary API calls; cache or debounce where appropriate.

## Quality Checks

Before considering any task complete:

1. Run the linter and fix all issues.
2. Ensure the project builds successfully.
3. Do not leave TypeScript errors or warnings.
4. Run tests if they exist and ensure they pass.
5. Do not introduce unnecessary dependencies.
6. Verify that no secrets or sensitive information are committed.

## General Principles

- Follow the existing project architecture and conventions.
- Write maintainable, production-ready code.
- Prefer clarity over cleverness.
- Minimize breaking changes.
- Keep commits focused and atomic.
- Keep documentation up to date when behavior changes.
- When modifying existing code, preserve consistency with the surrounding codebase instead of introducing a different style.