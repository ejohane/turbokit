/**
 * Configuration validation
 */

import type { ProjectConfig, CLIFlags, ValidationError } from '../types/config';
import { isValidPackageName } from '../utils/paths';
import { exists, isEmptyDir } from '../utils/fs';
import { dirname } from 'node:path';

/**
 * Validate project configuration before generation
 * @returns Array of validation errors (empty if valid)
 */
export async function validateConfig(
  config: ProjectConfig,
  flags: CLIFlags
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // 1. Validate project name
  if (!config.projectName) {
    errors.push({
      field: 'projectName',
      message: 'Project name is required',
    });
  } else if (!isValidPackageName(config.projectName)) {
    errors.push({
      field: 'projectName',
      message: `Invalid project name: "${config.projectName}"`,
      suggestion: 'Use lowercase letters, numbers, and hyphens only (kebab-case)',
    });
  }

  // Check for leading dots or underscores
  if (config.projectName.startsWith('.') || config.projectName.startsWith('_')) {
    errors.push({
      field: 'projectName',
      message: 'Project name cannot start with a dot or underscore',
      suggestion: 'Remove the leading dot or underscore',
    });
  }

  // 2. Validate project path
  if (!config.projectPath) {
    errors.push({
      field: 'projectPath',
      message: 'Project path is required',
    });
  } else {
    // Check if parent directory exists
    const parentDir = dirname(config.projectPath);
    const parentExists = await exists(parentDir);
    
    if (!parentExists) {
      errors.push({
        field: 'projectPath',
        message: `Parent directory does not exist: ${parentDir}`,
        suggestion: 'Create the parent directory first or use a different path',
      });
    }

    // Check if target directory exists and is not empty
    const pathExists = await exists(config.projectPath);
    if (pathExists) {
      const isEmpty = await isEmptyDir(config.projectPath);
      if (!isEmpty && !flags.force) {
        errors.push({
          field: 'projectPath',
          message: `Directory already exists and is not empty: ${config.projectPath}`,
          suggestion: 'Use --force to overwrite, or choose a different path',
        });
      }
    }
  }

  // 3. Validate module selection
  const { modules } = config;
  const hasAnyApp = modules.web || modules.mobile || modules.api || modules.storybook;
  
  if (!hasAnyApp) {
    errors.push({
      field: 'modules',
      message: 'At least one app module must be selected',
      suggestion: 'Select web, mobile, api, or storybook',
    });
  }

  // 4. Check module dependencies
  // Storybook works best with UI package
  if (modules.storybook && !modules.ui) {
    // This is a warning, not a blocking error
    // We could add a warnings array, but for now just skip
    // The user might have their own component library
  }

  return errors;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  let output = 'Validation errors:\n';
  
  for (const error of errors) {
    output += `\n  ✗ ${error.message}`;
    if (error.suggestion) {
      output += `\n    → ${error.suggestion}`;
    }
  }

  return output;
}
