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

## Event Naming Rules
- **Use "action:element" format** for all emit events
- Examples: `click:cell`, `change:data`, `update:selection`
- Use kebab-case for action names: `double-click:cell`
- Use kebab-case for element names: `change:grid-state`

## Vue Template Property Order
When writing Vue template properties, follow this strict order:

1. **v- directives (highest priority)**
   - `v-if`, `v-show`, `v-for`, `v-model` in that order
2. **: prefixed properties (bindings)**
   - `:class`, `:style`, `:key`, etc.
3. **Regular properties (no prefix)**
   - `class`, `id`, `type`, `name`, etc.
4. **Boolean properties**
   - `disabled`, `readonly`, `required`, etc.
5. **@ prefixed events (lowest priority)**
   - `@click`, `@change`, `@input`, etc.

### Example:
```pug
input(
  v-if="isVisible"
  v-model="inputValue"
  :class="inputClass"
  :style="inputStyle"
  type="text"
  placeholder="Enter text"
  disabled
  @input="handleInput"
  @blur="handleBlur"
)
```

## Sass Rules
- NO nesting - use flat structure
- Use BEM methodology for class names
- Define variables for colors, sizes, breakpoints
- Desktop-first responsive design
- **Properties must be in alphabetical order**

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
