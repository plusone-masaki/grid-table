# Error Handling Standards

## Immediate Error Resolution
- Fix ALL linter errors before proceeding
- Resolve type errors immediately
- Fix syntax errors on first occurrence
- Never commit code with errors

## Error Types to Check
1. **Linter Errors**: ESLint, Prettier violations
2. **Type Errors**: TypeScript compilation errors
3. **Syntax Errors**: Invalid code syntax
4. **Runtime Errors**: Logic and execution errors

## Error Prevention
- Use TypeScript strict mode
- Enable all ESLint rules
- Run type checking before commits
- Use proper error boundaries in components

## Error Handling Patterns
```typescript
// Try-catch for async operations
try {
  const result = await performOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw error
}

// Validation with early returns
if (!isValidInput(data)) {
  throw new Error('Invalid input data')
}
```

## Quality Gates
- Zero linter errors
- Zero type errors
- Zero syntax errors
- All tests passing
- No console errors in browser

## Error Monitoring
- Check browser console for runtime errors
- Monitor test output for failures
- Use development tools for debugging
- Log errors appropriately for debugging
