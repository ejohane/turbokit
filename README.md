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

## Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Runtime & Package Manager** | Bun | 1.1.43 |
| **Monorepo** | Turborepo | ^2.0.0 |
| **Language** | TypeScript | ^5.5.0 |
| **Linting** | ESLint (flat config) | ^9.0.0 |
| **Formatting** | Prettier | ^3.1.0 |
| **Git Hooks** | Husky | ^8.0.0 |
| **CI/CD** | GitHub Actions | - |

### Web App
| Technology | Version |
|------------|---------|
| React | ^18.2.0 |
| Vite | ^5.4.0 |
| Vitest | ^1.0.0 |
| Testing Library | ^14.1.0 |

### Mobile App
| Technology | Version |
|------------|---------|
| Expo | ~54.0.0 |
| React Native | 0.81.5 |

### API Server
| Technology | Version |
|------------|---------|
| Hono | ^4.6.0 |

### Storybook
| Technology | Version |
|------------|---------|
| Storybook | ^8.4.0 |

## Features

- Strict TypeScript configuration
- Shared config package (tsconfig, eslint, prettier)
- Shared UI component package
- Pre-configured CI/CD pipeline
- Pre-commit hooks (lint + typecheck)

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
