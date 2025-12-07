/**
 * File writing utilities for the generator
 */

import { mkdir } from 'node:fs/promises';
import { chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
import { exists } from '../utils/fs';

export interface WriteOptions {
  /** Make file executable (for scripts like pre-commit) */
  executable?: boolean;
  /** Create parent directories if they don't exist (default: true) */
  createDirs?: boolean;
  /** Overwrite existing files (default: true) */
  overwrite?: boolean;
}

export interface FileEntry {
  path: string;
  content: string;
  options?: WriteOptions;
}

/**
 * Write a single file with options
 */
export async function writeFile(
  path: string,
  content: string,
  options?: WriteOptions
): Promise<void> {
  const { executable = false, createDirs = true, overwrite = true } = options ?? {};

  // Check if file exists and skip if overwrite is false
  if (!overwrite && (await exists(path))) {
    return;
  }

  // Create parent directories if needed
  if (createDirs) {
    const dir = dirname(path);
    await mkdir(dir, { recursive: true });
  }

  // Write the file
  await Bun.write(path, content);

  // Make executable if requested
  if (executable) {
    await chmod(path, 0o755);
  }
}

/**
 * Write multiple files, creating parent directories as needed
 * Returns list of files written
 */
export async function writeFiles(files: FileEntry[]): Promise<string[]> {
  const writtenFiles: string[] = [];

  for (const file of files) {
    const { overwrite = true } = file.options ?? {};

    // Skip if file exists and overwrite is false
    if (!overwrite && (await exists(file.path))) {
      continue;
    }

    await writeFile(file.path, file.content, file.options);
    writtenFiles.push(file.path);
  }

  return writtenFiles;
}
