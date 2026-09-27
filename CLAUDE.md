# Development Instructions for Claude

You are a senior React TypeScript developer. Follow these rules to maintain codebase quality.

## Stack and Architecture

- React 18, TypeScript (strict mode), Create React App via `@craco/craco`
- Desktop shell: Electron — main process in `electron/electron.ts` and `electron/content.ts`, preload bridge in `electron/preload.ts`
- Components: arrow functions with hooks
- Styling: plain CSS, one stylesheet per component/page (BEM-ish class names), no CSS framework
- State Management: zustand (`src/app/store/*`)

## Core Coding Rules (Karpathy Rules)

Behavioral rules to reduce typical coding mistakes. Apply alongside all other project instructions.

### 1. Think First, Write Second

Don't guess. Don't hide uncertainty. Name trade-offs.

Before implementing:

- State your assumptions explicitly. If unsure — ask.
- If the task has multiple interpretations — name them, don't pick silently.
- If a simpler solution exists — say so. Push back if justified.
- If something is unclear — stop. Name what's unclear. Ask.

### 2. Simplicity First

Minimum code that solves the task. Nothing speculative.

- No features beyond what was requested.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't asked for.
- No error handling for impossible scenarios.
- If you wrote 200 lines and could have written 50 — rewrite.
- Ask yourself: "Would a senior developer say this is over-engineered?" If yes — simplify.

### 3. Surgical Edits

Touch only what's necessary. Clean up only the mess YOU created.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor what isn't broken.
- Follow existing style, even if you'd do it differently.
- If you notice unrelated dead code — mention it, don't delete it.

When your changes create orphans:

- Delete imports/variables/functions that became unused because of YOUR changes.
- Don't delete pre-existing dead code unless asked.
- Test: every changed line must directly trace to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Iterate until verified.

Convert tasks to verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, outline a brief plan:

1. [Step] → verify: [what to check]
2. [Step] → verify: [what to check]
3. [Step] → verify: [what to check]

Clear success criteria allow autonomous work. Vague criteria ("make it work") require constant clarification.

## Project Code Rules

### 1. TypeScript

- Always use strict typing (`interface` for props/state, avoid `any`).
- Separate logical blocks with a blank line.
- Always place a blank line before `return`.
- All `if` statements must have curly braces.
- Prefer `async/await` over `.then/.catch`.
- `async/await` functions must always be wrapped in `try/catch`.
- Do not leave your code comments if it's not REALLY important or hard for understanding.

Example:

```ts
const compare = (value: number) => {
  const a = 10;
  const b = 20;

  const sum = (a, b) => a + b;

  if (sum > value) {
    return 'larger';
  }

  return 'lower or equel';
};
```

### 2. Components

- Use `FC` (Function Component) with explicit props description.
- If the project has a UI framework installed — use its components rather than writing your own, unless absolutely necessary.
- For new components add `data-id="ComponentName"`, e.g.: `<div data-id="MyNewComponent">...</div>`

### 3. Structure

- Each component gets its own folder named after the component.
- Component folder contains `ComponentName.tsx` and `index.ts`.
- Large components should be split into subcomponents (not moved to shared or features).
- Subcomponents go into a `./components` folder inside the component's folder.

### 4. Hooks

- If component code is too large, extract logic into custom hooks placed in the component's folder.

### 5. Imports

- Use absolute paths unless it creates a circular dependency (e.g. `components/AiChat`).
- Import order is not enforced by a linter: follow the existing files (external packages, then `@/` absolute imports, then relative imports, then the stylesheet).
- ESLint is configured in the `eslintConfig` field of `package.json` (`react-app` preset plus a rule requiring a blank line before `return`); there is no `eslint.config` file. Run `npx eslint src electron --ext .ts,.tsx`.

### 6. Performance

- Use `memo`, `useCallback`, `useMemo` only when actually needed.

## Style

- Always study similar pages before writing code; replicate patterns where possible.
- Component props type name - Props or ComponentNameProps
- Prefer arrow functions: `export const ComponentName: FC<Props> = () => {}`.
- Destructure props.
- Avoid inline styles unless justified or it's a project pattern; use the component's own CSS file with BEM-ish class names (see existing `*.css` files).
- All `useEffect` hooks go before the JSX return, after function declarations.
- Props declaration and passing order:

  1. Dynamic props
  2. Static props
  3. Boolean props (without explicit `true`)
  4. Callbacks

  Example:

  ```tsx
  <UiButton
    value={selectedPosition}
    placeholder='Select position'
    clearable
    onChange={setSelectedPosition}
  />
  ```

- Always consider responsive design.
- For dynamic/conditional classes, build the class list manually with `.filter(Boolean).join(' ')` (see `Message.tsx`) — no `classnames` dependency is installed.

## Security

- Never use `dangerouslySetInnerHTML`.
- Validate incoming data.
