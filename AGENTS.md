# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Fix code**: `pnpm fix`
- **Check for issues**: `pnpm check`
- **Diagnose setup**: `pnpm exec ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers; extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions; do not forget to use the return value
- Use `async`/`await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with `try`/`catch` blocks
- Do not use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables, preferring unique IDs over array indices
- Nest children between opening and closing tags instead of passing them as props
- Do not define components inside other components
- Use semantic HTML and ARIA attributes for accessibility
- Provide meaningful alt text for images
- Use proper heading hierarchy
- Add labels for form inputs
- Include keyboard event handlers alongside mouse event handlers
- Use semantic elements such as `<button>` and `<nav>` instead of `div` elements with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try`/`catch` blocks meaningfully; do not catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Do not use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regular expression literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files that only re-export other modules

### React 19+

- Use `ref` as a prop instead of `React.forwardRef`

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid `done` callbacks in async tests; use `async`/`await` instead
- Do not use `.only` or `.skip` in committed code
- Keep test suites reasonably flat and avoid excessive `describe` nesting

## When Oxlint + Oxfmt Cannot Help

Oxlint + Oxfmt catches most mechanical issues automatically. Review these concerns directly:

1. **Business logic correctness**: validate algorithms and domain invariants.
2. **Meaningful naming**: use descriptive names for functions, variables, and types.
3. **Architecture decisions**: review component structure, data flow, and API design.
4. **Edge cases**: handle boundary conditions and error states.
5. **User experience**: review accessibility, performance, and usability.
6. **Documentation**: comment complex logic, but prefer self-documenting code.

Run `pnpm fix` before committing to ensure compliance.
