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
  /**
   * Template variant to use (e.g., 'with-api').
   * When set, files like 'App.with-api.tsx.template' will be copied as 'App.tsx'
   * and files like 'package.with-api.json.template' will be copied as 'package.json'.
   * The variant-specific file takes precedence over the default file.
   */
  variant?: string;
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
 * Create a filename transformer that handles variant files.
 * Variant files like 'App.with-api.tsx.template' become 'App.tsx' when variant='with-api'.
 * Also strips variant markers from non-selected variants.
 */
export function createVariantTransformer(variant?: string): (name: string) => string | null {
  return (name: string): string | null => {
    // First strip .template extension
    let result = name;
    if (result.endsWith('.template')) {
      result = result.slice(0, -'.template'.length);
    }

    // Check if this is a variant file (contains .with-something.)
    const variantMatch = result.match(/^(.+)\.with-([^.]+)\.(.+)$/);
    if (variantMatch) {
      const [, baseName, fileVariant, extension] = variantMatch;
      if (variant && fileVariant === variant) {
        // This is our selected variant - transform to base name
        return `${baseName}.${extension}`;
      } else {
        // This is a different variant or no variant selected - skip this file
        return null;
      }
    }

    // Not a variant file - check if a variant version should take precedence
    // This is handled by the caller filtering out base files when variant exists
    return result;
  };
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
    variant,
  } = options;

  // Create variant-aware transformer if variant is specified
  const variantTransformer = variant ? createVariantTransformer(variant) : null;

  const fileEntries: FileEntry[] = [];
  const destPaths: string[] = [];

  // Collect all filenames to detect variant conflicts
  const allFiles = new Set<string>();

  /**
   * First pass: collect all filenames to detect which base files have variants
   */
  async function collectFiles(srcDir: string): Promise<void> {
    const entries = await readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await collectFiles(join(srcDir, entry.name));
      } else {
        allFiles.add(entry.name);
      }
    }
  }

  // Collect all files first if we have a variant
  if (variant) {
    await collectFiles(templateDir);
  }

  /**
   * Check if a base file should be skipped because a variant file exists and is selected
   */
  function shouldSkipForVariant(fileName: string): boolean {
    if (!variant) return false;

    // Check if this is a base file that has a variant version
    // e.g., App.tsx.template should be skipped if App.with-api.tsx.template exists and variant='with-api'
    const withoutTemplate = fileName.endsWith('.template')
      ? fileName.slice(0, -'.template'.length)
      : fileName;

    // Extract base name and extension
    const lastDotIndex = withoutTemplate.lastIndexOf('.');
    if (lastDotIndex === -1) return false;

    const baseName = withoutTemplate.slice(0, lastDotIndex);
    const extension = withoutTemplate.slice(lastDotIndex + 1);

    // Check if variant file exists
    const variantFileName = `${baseName}.with-${variant}.${extension}.template`;
    return allFiles.has(variantFileName);
  }

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

        // Handle variant file selection
        let destFileName: string;
        if (variantTransformer) {
          const transformed = variantTransformer(entry.name);
          if (transformed === null) {
            // Skip this file (it's a variant file that doesn't match our variant)
            continue;
          }
          // Skip base files that have a selected variant
          if (shouldSkipForVariant(entry.name)) {
            continue;
          }
          destFileName = transformed;
        } else {
          // No variant - use default transformer but skip all variant files
          if (entry.name.includes('.with-')) {
            continue;
          }
          destFileName = transformFileName(entry.name);
        }

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
