/**
 * Filesystem utilities for the generator
 */

import { mkdir as fsMkdir, readdir, stat, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { wrapFileSystemError, TemplateNotFoundError } from './errors';

// Directories to skip when copying
const SKIP_DIRS = new Set(['node_modules', '.git', '.turbo', 'dist', 'coverage']);

/**
 * Check if a path exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory is empty
 */
export async function isEmptyDir(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length === 0;
  } catch {
    return true; // Non-existent directories are considered empty
  }
}

/**
 * Create a directory recursively
 */
export async function mkdir(path: string): Promise<void> {
  await fsMkdir(path, { recursive: true });
}

/**
 * Read a file as a string
 */
export async function readFile(path: string): Promise<string> {
  const file = Bun.file(path);
  return await file.text();
}

/**
 * Write a file, creating parent directories if needed
 */
export async function writeFile(
  path: string,
  content: string,
  options?: { executable?: boolean }
): Promise<void> {
  // Create parent directories
  const dir = dirname(path);
  await mkdir(dir);

  // Write the file
  await Bun.write(path, content);

  // Make executable if requested
  if (options?.executable) {
    await chmod(path, 0o755);
  }
}

/**
 * Copy a file with optional content transformation
 */
export async function copyFile(
  src: string,
  dest: string,
  transform?: (content: string) => string
): Promise<void> {
  const content = await readFile(src);
  const transformed = transform ? transform(content) : content;
  await writeFile(dest, transformed);
}

/**
 * Copy a directory recursively with optional transformation
 * @throws {TemplateNotFoundError} If source directory doesn't exist
 * @throws {TurbokitError} On file system errors
 */
export async function copyDir(
  src: string,
  dest: string,
  options?: {
    transform?: (content: string, filePath: string) => string;
    filter?: (name: string) => boolean;
  }
): Promise<string[]> {
  const createdFiles: string[] = [];

  // Check if source exists
  if (!(await exists(src))) {
    throw new TemplateNotFoundError(src);
  }

  async function copyRecursive(srcDir: string, destDir: string): Promise<void> {
    try {
      await mkdir(destDir);
    } catch (error) {
      throw wrapFileSystemError(error, destDir, 'create directory');
    }

    let entries;
    try {
      entries = await readdir(srcDir, { withFileTypes: true });
    } catch (error) {
      throw wrapFileSystemError(error, srcDir, 'read directory');
    }

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);

      // Skip certain directories
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      // Apply filter if provided
      if (options?.filter && !options.filter(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        await copyRecursive(srcPath, destPath);
      } else {
        try {
          await copyFile(srcPath, destPath, (content) =>
            options?.transform ? options.transform(content, srcPath) : content
          );
          createdFiles.push(destPath);
        } catch (error) {
          throw wrapFileSystemError(error, srcPath, 'copy file');
        }
      }
    }
  }

  await copyRecursive(src, dest);
  return createdFiles;
}

/**
 * List directory contents
 */
export async function readDir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

/**
 * Remove a directory recursively
 */
export async function removeDir(path: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  await rm(path, { recursive: true, force: true });
}
