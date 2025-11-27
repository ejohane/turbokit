/**
 * TypeScript types for CLI configuration
 */

/**
 * CLI flags parsed from command line arguments
 */
export interface CLIFlags {
  /** Project name (kebab-case) */
  name?: string;
  /** Target directory path */
  path?: string;
  /** Include web app (React + Vite) */
  web: boolean;
  /** Include mobile app (Expo) */
  mobile: boolean;
  /** Include API server (Bun + Hono) */
  api: boolean;
  /** Include Storybook app */
  storybook: boolean;
  /** Include shared UI package */
  ui: boolean;
  /** Skip interactive prompts, use defaults */
  yes: boolean;
  /** Print file tree without writing */
  dryRun: boolean;
  /** Show detailed output */
  verbose: boolean;
  /** Overwrite existing directory */
  force: boolean;
}

/**
 * Module selection for the generated project
 */
export interface ModuleSelection {
  /** Include web app (React + Vite) */
  web: boolean;
  /** Include mobile app (Expo) */
  mobile: boolean;
  /** Include API server (Bun + Hono) */
  api: boolean;
  /** Include Storybook app */
  storybook: boolean;
  /** Include shared UI package */
  ui: boolean;
}

/**
 * Complete project configuration after prompts and merging
 */
export interface ProjectConfig {
  /** Project name in kebab-case */
  projectName: string;
  /** Absolute path to project directory */
  projectPath: string;
  /** npm scope (e.g., @my-project) */
  scope: string;
  /** Selected modules to generate */
  modules: ModuleSelection;
}

/**
 * Template variables for token replacement
 */
export interface TemplateVariables {
  /** Project name in kebab-case */
  projectName: string;
  /** npm scope (e.g., @my-project) */
  scope: string;
  /** Current year for LICENSE files */
  year: string;
  /** Package versions */
  reactVersion: string;
  typescriptVersion: string;
  viteVersion: string;
  expoVersion: string;
  honoVersion: string;
  storybookVersion: string;
  vitestVersion: string;
  turboVersion: string;
  eslintVersion: string;
  prettierVersion: string;
  huskyVersion: string;
}

/**
 * Validation error returned by validateConfig
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}
