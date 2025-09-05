# Testing Requirements

## Test-Driven Development
- Create unit tests for EVERY component
- Write tests before or alongside implementation
- Ensure 100% test coverage for critical paths
- All tests must pass before feature completion

## Test Structure
- Location: `src/__tests__/`
- Naming: `ComponentName.spec.ts`
- Use Vitest framework
- Mock external dependencies

## Test Categories
1. **Component Rendering**: Verify correct DOM output
2. **User Interactions**: Test click, input, keyboard events
3. **Props Validation**: Test prop types and defaults
4. **Event Emission**: Verify events are emitted correctly
5. **State Management**: Test reactive state changes

## Test Quality Standards
- Each test should be independent
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies appropriately
- Keep tests simple and focused

## Required Test Coverage
- All public methods and computed properties
- All user interaction handlers
- All event emissions
- Error handling scenarios
- Edge cases and boundary conditions

## Test Execution
- Run tests after every implementation change
- Fix failing tests immediately
- Ensure all tests pass before committing
- Use watch mode during development
