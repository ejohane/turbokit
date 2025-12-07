/**
 * Template variable replacement engine
 */

import type { ProjectConfig, TemplateVariables } from '../types/config';
import { VERSIONS } from '../config/defaults';

/**
 * Replace all {{variable}} patterns in content
 * @param content - Template content with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns Content with all variables replaced
 * @throws Error if undefined variable is encountered
 */
export function applyVariables(
  content: string,
  variables: TemplateVariables
): string {
  // Handle empty content
  if (!content) {
    return content;
  }

  const pattern = /\{\{(\w+)\}\}/g;

  return content.replace(pattern, (_match, variableName: string) => {
    const value = variables[variableName as keyof TemplateVariables];

    if (value === undefined) {
      throw new Error(
        `Undefined template variable: {{${variableName}}}. ` +
          `Available variables: ${Object.keys(variables).join(', ')}`
      );
    }

    return value;
  });
}

/**
 * Build TemplateVariables object from ProjectConfig
 * @param config - Project configuration
 * @returns Complete TemplateVariables object
 */
export function buildVariables(config: ProjectConfig): TemplateVariables {
  return {
    projectName: config.projectName,
    scope: config.scope,
    year: new Date().getFullYear().toString(),
    reactVersion: VERSIONS.react,
    typescriptVersion: VERSIONS.typescript,
    viteVersion: VERSIONS.vite,
    expoVersion: VERSIONS.expo,
    honoVersion: VERSIONS.hono,
    storybookVersion: VERSIONS.storybook,
    vitestVersion: VERSIONS.vitest,
    turboVersion: VERSIONS.turbo,
    eslintVersion: VERSIONS.eslint,
    prettierVersion: VERSIONS.prettier,
    huskyVersion: VERSIONS.husky,
  };
}
