# Turbokit

A CLI to generate Turborepo-based monorepo projects with Bun, TypeScript, React, and more.

## Quick Start

```bash
bunx turbokit
```

Or install globally:

```bash
bun install -g turbokit
turbokit
```

## Features

- Turborepo monorepo structure
- Bun runtime + package manager
- TypeScript everywhere
- Optional modules:
  - Web app (React + Vite)
  - Mobile app (Expo)
  - API server (Bun + Hono)
  - Storybook
- Shared config and UI packages
- Pre-configured CI/CD (GitHub Actions)
- Husky pre-commit hooks

## Usage

```bash
turbokit [options]

Options:
  --name <name>     Project name (kebab-case)
  --path <path>     Target directory (default: ./<name>)
  --web             Include web app (React + Vite)
  --mobile          Include mobile app (Expo)
  --api             Include API server (Bun + Hono)
  --storybook       Include Storybook app
  --ui              Include shared UI package
  -y, --yes         Skip prompts, use defaults
  --dry-run         Print file tree without writing
  -v, --verbose     Show detailed output
  -f, --force       Overwrite existing directory
  -h, --help        Show help
  --version         Show version
```

## Examples

### Interactive mode (recommended)

```bash
turbokit
```

### Create project with all apps

```bash
turbokit --name my-project --web --mobile --api --storybook --ui --yes
```

### Create minimal web-only project

```bash
turbokit --name my-web-app --web --yes
```

### Preview what will be generated

```bash
turbokit --name preview --web --api --dry-run
```

## Generated Project Structure

```
my-project/
├── apps/
│   ├── web/          # React + Vite web application
│   ├── mobile/       # Expo React Native app
│   ├── api/          # Bun + Hono API server
│   └── storybook/    # Storybook for UI components
├── packages/
│   ├── config/       # Shared TypeScript, ESLint, Prettier config
│   └── ui/           # Shared UI components
├── .github/
│   └── workflows/
│       └── ci.yml    # GitHub Actions CI
├── .husky/
│   └── pre-commit    # Pre-commit hooks
├── turbo.json
├── package.json
├── tsconfig.json
├── AGENTS.md
└── README.md
```

## Requirements

- Bun >= 1.0
- Git (for initialization)

## License

MIT
