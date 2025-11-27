# Turbokit CLI — Full Specification

A complete end‑to‑end specification for a Turborepo‑based project generator CLI using Bun, TypeScript, React, Expo, Hono, Storybook, Husky, and consistent shared configuration.

This document consolidates **all steps (1–5)** we discussed. It is intended as a handoff document for an LLM to begin implementation.

---

# Table of Contents
1. [Step 1 — Goals & Constraints](#step-1--goals--constraints)
2. [Step 2 — Monorepo Architecture & Layout](#step-2--monorepo-architecture--layout)
3. [Step 3 — Templates & Configuration Specs](#step-3--templates--configuration-specs)
4. [Step 4 — CLI Design & Behavior](#step-4--cli-design--behavior)
5. [Step 5 — Implementation Architecture](#step-5--implementation-architecture)
6. [Appendix — Future Enhancements](#appendix--future-enhancements)

---

# Step 1 — Goals & Constraints

## Primary Goal
Create a **single CLI tool** that bootstraps a new **Turborepo-based monorepo** using an opinionated stack:

- Bun (runtime + package manager)
- TypeScript everywhere
- Vite + React (web)
- Expo / React Native (mobile)
- Bun + Hono (API)
- Storybook (component exploration)
- Shared UI package
- Shared config package (TS, ESLint, Prettier)

The CLI must allow selecting which modules to include.

## Always a Monorepo
All generated projects use a Turborepo monorepo layout. No single-project support.

## Required Output
Every generated project includes:

- `apps/*` (web, mobile, api, storybook)
- `packages/*` (config always, ui optional)
- `.github/workflows` for CI
- Husky pre-commit hook (lint, typecheck, test, build)
- README.md
- AGENTS.md

## Non-Goals (v1)
- No infra templates
- No plugin/extensions system
- No Windows support requirement
- No cloud deployment templates

---

# Step 2 — Monorepo Architecture & Layout

## Folder Structure
```
root/
  apps/
    web/
    mobile/
    api/
    storybook/

  packages/
    config/
    ui/

  .github/workflows/
  turbo.json
  tsconfig.json
  package.json
  README.md
  AGENTS.md
  .gitignore
  .editorconfig
  .husky/
```

## Root Responsibilities
- Defines scripts: `dev`, `build`, `lint`, `test`, `typecheck`, `ci`
- Workspaces: `apps/*`, `packages/*`
- Centralized dependencies: TypeScript, Turbo, ESLint, Prettier, Husky

## `packages/config`
Contains all shared configuration:

- tsconfig.base.json
- tsconfig.react.json
- tsconfig.node.json
- eslint-config-custom.cjs
- prettier.config.cjs

Every app/package extends these.

## Turborepo Pipeline
```
build → dependsOn: ^build
lint → no outputs
test → no outputs
typecheck → no outputs
dev → cache: false
```

## App Templates
### Web (`apps/web`)
- React + Vite
- vitest + testing-library

### Mobile (`apps/mobile`)
- Expo + React Native

### API (`apps/api`)
- Bun server using Hono

### Storybook (`apps/storybook`)
- React + Vite Storybook
- Links to `packages/ui`

## Shared UI Package (`packages/ui`)
- Minimal starter component
- Peer dependencies: react, react-dom

---

# Step 3 — Templates & Configuration Specs

This section defines the exact files that the CLI will generate.

## Root Files
- `package.json`
- `tsconfig.json`
- `turbo.json`
- `.gitignore`
- `.editorconfig`
- `README.md`
- `AGENTS.md`

## Husky Pre-Commit Hook
Pre-commit runs **CI-matching tasks**:

```
bun lint
bun typecheck
bun test
bun build
```

No pre‑push hook.

## CI Workflow
Created at `.github/workflows/ci.yml`:

- Checkout
- Setup Bun
- `bun install`
- `bun lint`
- `bun typecheck`
- `bun test`
- `bun build`

## Templates for Each App
All template files defined earlier (App.tsx, index.tsx, Vite config, Expo config, Hono server, Storybook config, etc.).

## Templates for Shared Packages
- `packages/config/*`
- `packages/ui/*`

---

# Step 4 — CLI Design & Behavior

## Command
```
turbokit
```

## Flags
```
--name <string>
--path <path>
--web
--mobile
--api
--storybook
--ui
--yes               # skip prompts
--dry-run
--verbose
--force
```

## Interactive Prompts
If flags are missing:
1. Project name
2. Project path
3. Module selection (multi-select)
4. Summary + confirmation

## Generation Pipeline
```
parseArgs → prompts → config → validate → (dry-run?) → write files → bun install → husky setup → git init → summary
```

## Dry Run Mode
Prints file tree and exits.

## Git Init
Initial commit added automatically.

---

# Step 5 — Implementation Architecture

## Project Structure (CLI Implementation)
```
turbokit/
  bin/turbokit.ts
  src/
    index.ts
    cli/
      parseArgs.ts
      prompts.ts
      summary.ts

    generator/
      generate.ts
      writeFiles.ts
      copyTemplate.ts
      applyVariables.ts
      installDeps.ts
      setupHusky.ts
      initGit.ts
      validate.ts

    config/
      defaults.ts

    types/
      config.ts

    utils/
      fs.ts
      paths.ts
      logger.ts

  templates/
    root/
    apps/
      web/
      mobile/
      api/
      storybook/
    packages/
      config/
      ui/
    pipelines/
      ci.yml

  package.json
  tsconfig.json
```

## Execution Flow
```
bin → src/index.ts → parseArgs → prompts → validate → generate → installDeps → husky → git → summary
```

## Template Rendering
- Copies directory tree
- Replaces tokens: `{{projectName}}`, `{{scope}}`, versions, etc.

## Logging
- Quiet by default
- `--verbose` prints detailed operations

## Publishing
- Published to npm as a global CLI
- Supports:
  - `bunx turbokit`
  - `turbokit` if installed globally

---

# Appendix — Future Enhancements
These are **not part of v1** but the spec leaves room for them.

- `turbokit add <module>`
- `turbokit upgrade` (template versioning)
- Template packs (custom user templates)
- Remote template sources
- Selective task running in hooks (lint-staged)
- Turbo remote caching
- Benchmarking and profiling

---

# End of Document

This file contains **all necessary details** for another LLM or developer to fully implement the CLI from scratch.

