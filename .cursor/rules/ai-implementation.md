# AI Implementation Guidelines

## Development Process
1. **Read Specifications**: Load relevant specs from `specs/design/functions/` and `specs/design/technical/`
2. **Review Types**: Check `src/types/` for required interfaces
3. **Implement Feature**: Build according to specifications exactly
4. **Create Tests**: Write unit tests for all functionality
5. **Verify Quality**: Ensure all errors are fixed and tests pass

## Feature Implementation Order
1. Data Display & Edit (`01_data_display_edit`)
2. Table Structure Operations (`02_table_structure_operations`)
3. Cell Selection Operations (`03_cell_selection_operations`)
4. Fast Rendering (`04_fast_rendering`)
5. Undo/Redo (`05_undo_redo`)
6. Additional Features (`06_additional_features`)

## Code Quality Requirements
- Follow all coding standards strictly
- Use TypeScript for type safety
- Implement proper error handling
- Write comprehensive unit tests
- Ensure zero linter/type errors

## Specification Compliance
- **ALWAYS follow specifications exactly** - Never deviate from written specifications
- **Read specifications first** - Always check `specs/design/functions/` before implementing
- **Use specified technologies** - If spec says "HTML table", use `<table>`, not `<div>`
- **Follow naming conventions** - Use exact names and formats specified in docs
- **Implement all requirements** - Every requirement must be implemented as written

## Prohibited Actions
- Starting without reading specifications
- Implementing multiple features simultaneously
- Proceeding with any errors present
- Skipping unit tests
- Deviating from specifications
- Using different technologies than specified

## Success Criteria
- All specifications implemented correctly
- All tests passing
- Zero errors of any kind
- Code follows all standards
- Feature works as specified

## File Structure
- Components: `src/components/ComponentName.vue`
- Composables: `src/composables/useFeatureName.ts`
- Types: `src/types/feature-name.ts`
- Tests: `src/__tests__/ComponentName.spec.ts`
- Styles: `src/styles/feature-name.sass`
