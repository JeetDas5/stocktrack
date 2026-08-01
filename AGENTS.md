# AGENTS.md

## NexBrix Development Guidelines

Follow these rules for every change made to the project.

### Code Standards

- Use **TypeScript** everywhere. Avoid JavaScript unless absolutely necessary.
- Prefer strict typing. Avoid `any`; use proper interfaces, types, or generics.
- Keep components and functions small, reusable, and readable.

### React Best Practices

- **Never update state inside `useEffect` if it can be derived during render.**
- Avoid patterns like:
  ```tsx
  useEffect(() => {
    setData(computeData(props));
  }, [props]);
  ```
  Instead, derive the value directly or use `useMemo` when needed.
- Use `useEffect` only for synchronizing with external systems (API calls, subscriptions, timers, etc.).

- Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended

### UI & Design

- Follow the existing **NexBrix design system and color schema**.
- Reuse existing components before creating new ones.
- Keep UI consistent, clean, and professional.

### Quality Checks

Before considering any task complete:

1. Run lint and fix all issues.
2. Ensure the project builds successfully.
3. Do not leave TypeScript errors or warnings.
4. Do not introduce unnecessary dependencies.

### General Principles

- Follow existing project architecture and conventions.
- Write maintainable, production-ready code.
- Prefer clarity over cleverness.
- Minimize breaking changes.
- Keep commits focused and atomic.