/**
 * Path utilities for the CLI
 */

import { resolve, join, relative, dirname } from 'node:path';

/**
 * Get the CLI package root directory
 * Works in both development and installed package scenarios
 */
export function getPackageRoot(): string {
  // import.meta.dir gives us the directory of this file
  // Go up from src/utils to the package root
  return resolve(dirname(import.meta.dir), '..');
}

/**
 * Get the absolute path to the templates directory
 */
export function getTemplatesDir(): string {
  return join(getPackageRoot(), 'templates');
}

/**
 * Resolve a path relative to the current working directory
 */
export function resolveFromCwd(relativePath: string): string {
  return resolve(process.cwd(), relativePath);
}

/**
 * Convert a project name to a valid directory name
 * - Converts to lowercase
 * - Replaces spaces and underscores with hyphens
 * - Removes invalid characters
 * - Ensures it doesn't start with a dot or hyphen
 */
export function toValidDirName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/^[-.]/, '') // Remove leading dot or hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/-$/, ''); // Remove trailing hyphen
}

/**
 * Check if a string is a valid npm package name
 */
export function isValidPackageName(name: string): boolean {
  // npm package name rules:
  // - lowercase
  // - can contain hyphens
  // - can't start with dot or underscore
  // - can't contain spaces
  // - max 214 characters
  const validNameRegex = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return validNameRegex.test(name) && name.length <= 214;
}

/**
 * Join path segments safely
 */
export function joinPaths(...paths: string[]): string {
  return join(...paths);
}

/**
 * Get relative path from one path to another
 */
export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

/**
 * Convert project name to npm scope (without @ prefix)
 * The @ is added in templates: @{{scope}}/package-name
 * @example "my-project" -> "my-project"
 */
export function toScope(projectName: string): string {
  return projectName;
}
