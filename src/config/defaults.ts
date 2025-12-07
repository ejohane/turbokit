/**
 * Default configuration values for the CLI
 */

import type { ModuleSelection } from '../types/config';

/**
 * Default module selection when --yes is used without specific flags
 */
export const DEFAULT_MODULES: ModuleSelection = {
  web: true,
  mobile: false,
  api: true,
  storybook: false,
  ui: true,
};

/**
 * Default path for generated projects (current directory)
 */
export const DEFAULT_PATH = '.';

/**
 * Package versions for templates
 * Update these when upgrading dependencies
 */
export const VERSIONS = {
  // Core
  react: '^18.2.0',
  reactDom: '^18.2.0',
  typescript: '^5.3.0',

  // Build tools
  vite: '^5.0.0',
  turbo: '^2.0.0',

  // Mobile
  expo: '~50.0.0',
  reactNative: '0.73.0',

  // API
  hono: '^3.11.0',

  // Testing
  vitest: '^1.0.0',
  testingLibraryReact: '^14.1.0',
  testingLibraryJestDom: '^6.1.0',

  // Storybook
  storybook: '^7.6.0',

  // Linting & Formatting
  eslint: '^8.55.0',
  prettier: '^3.1.0',
  typescriptEslint: '^6.13.0',
  eslintPluginReact: '^7.33.0',
  eslintPluginReactHooks: '^4.6.0',

  // Git hooks
  husky: '^8.0.0',

  // Type definitions
  typesReact: '^18.2.0',
  typesReactDom: '^18.2.0',
  typesBun: 'latest',
  typesNode: '^20.0.0',
} as const;

/**
 * All default configuration values
 */
export const DEFAULT_CONFIG = {
  modules: DEFAULT_MODULES,
  defaultPath: DEFAULT_PATH,
  versions: VERSIONS,
} as const;
