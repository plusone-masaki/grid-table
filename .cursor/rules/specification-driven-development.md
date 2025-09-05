# Specification-Driven Development Rules

## Core Development Principles

### 1. Specification-First Approach
- ALWAYS read relevant specifications before implementing any feature
- Functional specs: `specs/design/functions/`
- Technical specs: `specs/design/technical/`
- Type definitions: `src/types/`
- Never deviate from specifications

### 2. Feature-by-Feature Implementation
- Complete one feature fully before moving to next
- Follow specification order: data-display → table-structure → cell-selection → fast-rendering → undo-redo → additional-features
- Each feature must be fully tested before proceeding

### 3. Quality Gates
- Fix ALL errors immediately (linter, type, syntax)
- Create unit tests for every component
- Ensure all tests pass before marking feature complete
- Follow coding standards strictly

## Implementation Workflow

1. **Read**: Load relevant specification documents
2. **Plan**: Review type definitions and requirements
3. **Implement**: Build according to specifications
4. **Test**: Create and run unit tests
5. **Verify**: Ensure all quality gates pass

## File Structure Rules

- Components: `src/components/`
- Composables: `src/composables/`
- Types: `src/types/`
- Tests: `src/__tests__/`
- Styles: `src/styles/`

## Technology Stack

- Vue.js 3.x with Composition API
- TypeScript for type safety
- Pug for templates
- Sass for styling (no nesting)
- Desktop-first responsive design

## Prohibited Actions

- Starting implementation without reading specs
- Implementing multiple features simultaneously
- Proceeding with any errors present
- Skipping unit tests
- Deviating from specifications
