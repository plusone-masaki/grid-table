# Coding Standards

## Vue.js Structure
```vue
<template lang="pug">
  // Pug templates - div tags must be explicit
  div.container
    div.header
      h1 Title
    div.content
      p Content
</template>

<script setup lang="ts">
// TypeScript with Composition API
</script>

<style lang="sass" scoped>
// Sass styles (no nesting)
</style>
```

## Pug Rules
- **ALWAYS write `div` explicitly** - never omit div tags
- Use proper indentation (2 spaces)
- Use dot notation for classes: `div.class-name`
- Use hash notation for IDs: `div#element-id`
- Use parentheses for attributes: `div(class="class-name", id="element-id")`

## Naming Conventions
- Components: PascalCase (`GridTable.vue`)
- Files: kebab-case (`cell-editor.vue`)
- Composables: `use` prefix (`useGridState`)
- Classes: BEM notation (`.grid-table__cell--selected`)

## TypeScript Rules
- Always define interfaces for props and emits
- Use type annotations for function parameters and returns
- Prefer composition API over options API
- Use `withDefaults` for prop defaults
- **Use arrow functions ONLY** - never use `function` keyword
- Use `const` for function declarations: `const myFunction = () => {}`

## Sass Rules
- NO nesting - use flat structure
- Use BEM methodology for class names
- Define variables for colors, sizes, breakpoints
- Desktop-first responsive design

## Code Quality
- Write meaningful comments
- Use descriptive variable and function names
- Follow single responsibility principle
- Implement proper error handling

## File Organization
```
src/
├── components/     # Vue components
├── composables/    # Reusable logic
├── types/          # TypeScript definitions
├── styles/         # Sass files
└── utils/          # Utility functions
```
