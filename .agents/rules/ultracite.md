# Ultracite Code Rules

Write code that is accessible, performant, type-safe, and maintainable. Focus on clarity and explicit intent over brevity.

## Type Safety and Explicitness

- Use explicit types for function parameters and return values when they enhance clarity.
- Prefer `unknown` over `any` when the type is genuinely unknown.
- Use const assertions (`as const`) for immutable values and literal types.
- Leverage TypeScript's type narrowing instead of type assertions.
- Use meaningful variable names instead of magic numbers; extract constants with descriptive names.

## Modern JavaScript and TypeScript

- Use arrow functions for callbacks and short functions.
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops.
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access.
- Prefer template literals over string concatenation.
- Use destructuring for object and array assignments.
- Use `const` by default, `let` only when reassignment is needed, and never `var`.

## Async and Promises

- Always await promises in async functions and use their return values.
- Use `async`/`await` instead of promise chains when it improves readability.
- Handle errors appropriately with meaningful `try`/`catch` blocks.
- Do not use async functions as Promise executors.

## React and JSX

- Use function components over class components.
- Call hooks only at the top level.
- Specify hook dependencies correctly.
- Use unique IDs rather than array indexes for iterable element keys.
- Nest children between opening and closing tags instead of passing them as props.
- Do not define components inside other components.
- Use semantic HTML and appropriate ARIA attributes.
- Provide meaningful alt text for images.
- Use a proper heading hierarchy.
- Add labels for form inputs.
- Include keyboard handlers when non-semantic elements have mouse handlers.
- Prefer semantic elements such as `<button>` and `<nav>` over elements with equivalent roles.
- With React 19+, use `ref` as a prop instead of `React.forwardRef`.

## Error Handling and Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code.
- Throw descriptive `Error` objects, not strings or other values.
- Do not catch errors only to rethrow them.
- Prefer early returns over nested error conditionals.

## Code Organization

- Keep functions focused and below reasonable cognitive-complexity limits.
- Extract complex conditions into well-named booleans.
- Use early returns to reduce nesting.
- Prefer simple conditionals over nested ternaries.
- Group related code and separate concerns.

## Security

- Add `rel="noopener"` to links that use `target="_blank"`.
- Avoid `dangerouslySetInnerHTML` unless it is necessary.
- Do not use `eval()` or assign directly to `document.cookie`.
- Validate and sanitize user input.

## Performance

- Avoid spread syntax in accumulators inside loops.
- Use top-level regular-expression literals instead of creating them in loops.
- Prefer specific imports over namespace imports.
- Avoid barrel files that only re-export other modules.

## Testing

- Write assertions inside `it()` or `test()` blocks.
- Use `async`/`await` instead of `done` callbacks in async tests.
- Do not commit `.only` or `.skip`.
- Keep test suites reasonably flat and avoid excessive `describe` nesting.

## Manual Review

Oxlint and Oxfmt catch most mechanical issues. Review these concerns directly:

1. Validate business logic, algorithms, and domain invariants.
2. Use meaningful names for functions, variables, and types.
3. Review component structure, data flow, and API design.
4. Handle boundary conditions and error states.
5. Review accessibility, performance, and usability.
6. Comment complex logic, but prefer self-documenting code.
