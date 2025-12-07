/**
 * Template copying logic with variable replacement
 */

import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { TemplateVariables } from '../types/config';
import { applyVariables } from './applyVariables';
import { writeFiles, type FileEntry } from './writeFiles';
import { mkdir, readFile } from '../utils/fs';

/** Binary file extensions that should skip variable replacement */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

/** Default directories to exclude when copying */
const DEFAULT_EXCLUDE = ['node_modules', '.git'];

export interface CopyOptions {
  /** Variables for template replacement */
  variables: TemplateVariables;
  /** File/directory patterns to exclude (e.g., ['.git', 'node_modules']) */
  exclude?: string[];
  /** Only include files matching these patterns (if specified) */
  include?: string[];
  /** Transform file names - default removes .template extension */
  transformFileName?: (name: string) => string;
  /** Whether to actually write files or just return list (for dry-run) */
  dryRun?: boolean;
}

/**
 * Default filename transformer - removes .template extension
 */
export function defaultTransformFileName(name: string): string {
  if (name.endsWith('.template')) {
    return name.slice(0, -'.template'.length);
  }
  return name;
}

/**
 * Check if a file is binary based on extension
 */
function isBinaryFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if a name matches any pattern in the list
 * Supports simple glob patterns with * wildcard
 */
function matchesPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(name);
    }
    return name === pattern;
  });
}

/**
 * Copy template directory to destination, applying variable replacement
 * @returns List of destination file paths (created or would-be-created)
 */
export async function copyTemplate(
  templateDir: string,
  destDir: string,
  options: CopyOptions
): Promise<string[]> {
  const {
    variables,
    exclude = DEFAULT_EXCLUDE,
    include,
    transformFileName = defaultTransformFileName,
    dryRun = false,
  } = options;

  const fileEntries: FileEntry[] = [];
  const destPaths: string[] = [];

  /**
   * Recursively walk the template directory
   */
  async function walkDir(srcDir: string, destSubDir: string): Promise<void> {
    const entries = await readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);

      // Check exclusion patterns
      if (matchesPattern(entry.name, exclude)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        await walkDir(srcPath, join(destSubDir, entry.name));
      } else {
        // Check inclusion patterns if specified
        if (include && !matchesPattern(entry.name, include)) {
          continue;
        }

        // Transform the filename
        const destFileName = transformFileName(entry.name);
        const destPath = join(destSubDir, destFileName);

        // Read file content
        let content: string;
        if (isBinaryFile(entry.name)) {
          // For binary files, read as-is without transformation
          content = await readFile(srcPath);
        } else {
          // For text files, apply variable replacement
          const rawContent = await readFile(srcPath);
          content = applyVariables(rawContent, variables);
        }

        fileEntries.push({
          path: destPath,
          content,
        });
        destPaths.push(destPath);
      }
    }
  }

  // Walk the template directory
  await walkDir(templateDir, destDir);

  // Write files unless dry run
  if (!dryRun) {
    await mkdir(destDir);
    await writeFiles(fileEntries);
  }

  return destPaths;
}
