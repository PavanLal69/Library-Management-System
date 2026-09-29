# Contributing Guidelines

## Development Workflow

1. **Branching**:
   - Create feature branches named `feature/<feature-name>` or `fix/<bug-name>`.
2. **Coding Standards**:
   - Strict TypeScript: No `any` escapes without justification.
   - Separation of concerns: Keep database logic in `src/server/services` or `src/server/repositories`. UI components must never execute direct SQL.
   - Validation: All API routes must validate input using Zod schemas.
3. **Local Testing**:
   - Run type checking: `npx tsc --noEmit`
   - Run lifecycle tests: `npm run test`
   - Verify build: `npm run build`
4. **Commits**:
   - Use conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`).
