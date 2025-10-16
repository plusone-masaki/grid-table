Note: All responses must be provided in Japanese.

# Project Agent Guidelines

This document consolidates the workflow and quality rules that lived in `origin/develop:.cursor/rules/`. Treat them as the default operating manual when planning or implementing features.

## Core Principles
- **Specification-first**: Always read the functional (`specs/design/functions/`) and technical (`specs/design/technical/`) specs, plus any relevant type definitions under `src/types/`, before writing code.
- **Single feature focus**: Ship features sequentially in the prescribed order — data display/edit, table structure operations, cell selection, fast rendering, undo/redo, then additional features.
- **No deviations**: Implement requirements exactly as written. Use the technologies and naming conventions mandated by the specifications.

## Feature Roadmap
- **Data Display & Edit**: Render grid data, support inline cell editing, and keep values synchronized with the underlying dataset.
- **Table Structure Operations**: Manage rows and columns (insert, delete, resize, reorder) while retaining data integrity.
- **Cell Selection Operations**: Provide intuitive selection (single, range, multi-select) with keyboard and pointer controls.
- **Fast Rendering**: Maintain smooth performance for large datasets through virtualization and other rendering optimizations.
- **Undo / Redo**: Record user actions and offer reliable undo/redo with sensible grouping of operations.
- **Additional Enhancements**: Layer on auxiliary capabilities (e.g., import/export, theming, integrations) that complement the core spreadsheet experience.

## Implementation Workflow
1. Read the specs and supporting types.
2. Plan the approach against the documented requirements.
3. Implement the feature to the letter of the spec.
4. Create and run comprehensive tests.
5. Fix every error and verify quality gates before moving on.

## Technology & Structure
- Stack: React 18 on Vite with modern hooks-based components. Prefer TypeScript (`.tsx`) for new code; migrate existing `.jsx` files as features solidify. Styling defaults to plain CSS (or CSS Modules) with desktop-first responsive design.
- File placement: Components in `src/components/`, hooks in `src/hooks/`, context providers in `src/context/`, shared types in `src/types/`, tests in `src/__tests__/`, styles in `src/styles/`, utilities in `src/utils/`.
- Component layout: define function components with top-level hooks, keep JSX lean, and colocate component-specific styles/tests when it improves cohesion.

## Coding Standards
- Use PascalCase for components (`GridTable.tsx`), kebab-case for non-component files, and prefix reusable hooks with `use`.
- Prefer arrow functions (`const Component = () => {}`) and describe props via TypeScript interfaces (or `PropTypes` only when TS is unavailable).
- Structure JSX attributes consistently: `key` → `ref` → data bindings → `className`/`style` → accessibility props → event handlers.
- Centralize reusable styles/tokens; when using plain CSS keep selectors BEM-friendly and avoid deep nesting.

## Quality Gates & Error Handling
- Zero tolerance for linter, type, syntax, or runtime errors; resolve them immediately.
- Apply strict TypeScript settings and ESLint rules, and never commit with outstanding issues.
- Wrap async work in try/catch, validate inputs early, and propagate/log errors appropriately.
- Monitor console/test output continually while developing.

## Testing Requirements
- Practice test-driven (or test-along) development with Vitest and React Testing Library in `src/__tests__/ComponentName.test.tsx`.
- Cover rendering, interactions, props, event emissions, state changes, and edge cases.
- Keep tests isolated, descriptive, and maintain full coverage on critical paths.
- Do not mark a feature complete until the entire suite passes.

By following these directives, agents stay aligned with the original project vision and maintain the rigor expected on the develop branch.
