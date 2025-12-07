/**
 * Git repository initialization module
 * Initializes a git repository with an initial commit
 */

import { join } from 'node:path';
import { $ } from 'bun';
import type { Logger } from '../utils/logger';
import { exists } from '../utils/fs';

/**
 * Options for git initialization
 */
export interface GitOptions {
  /** Project directory */
  cwd: string;
  /** Project name for commit message */
  projectName: string;
  /** Enable verbose logging */
  verbose: boolean;
  /** Logger instance */
  logger: Logger;
}

/**
 * Check if git is installed and available
 */
async function isGitInstalled(logger: Logger): Promise<boolean> {
  try {
    const result = await $`git --version`.quiet();
    logger.debug(`Git version: ${result.text().trim()}`);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Check if directory is already a git repository
 */
async function isGitRepo(cwd: string): Promise<boolean> {
  return exists(join(cwd, '.git'));
}

/**
 * Initialize a git repository with an initial commit
 *
 * @param options - Git initialization options
 * @returns Promise that resolves when git init is complete
 *
 * @remarks
 * This function will:
 * - Check if git is installed (warns but doesn't fail if not)
 * - Skip if .git already exists
 * - Run git init, add all files, and create initial commit
 */
export async function initGit(options: GitOptions): Promise<void> {
  const { cwd, logger } = options;

  // Check if git is installed
  if (!(await isGitInstalled(logger))) {
    logger.warn(
      'Git is not installed. Skipping repository initialization.'
    );
    logger.warn(
      'You can initialize the repository later with: git init && git add . && git commit -m "Initial commit"'
    );
    return;
  }

  // Check if already a git repository
  if (await isGitRepo(cwd)) {
    logger.debug('Directory is already a git repository, skipping init');
    return;
  }

  try {
    // Initialize repository
    logger.debug('Running git init');
    const initResult = await $`git init`.cwd(cwd).quiet();
    if (initResult.exitCode !== 0) {
      throw new Error(`git init failed: ${initResult.stderr.toString()}`);
    }

    // Stage all files
    logger.debug('Running git add .');
    const addResult = await $`git add .`.cwd(cwd).quiet();
    if (addResult.exitCode !== 0) {
      throw new Error(`git add failed: ${addResult.stderr.toString()}`);
    }

    // Create initial commit
    const commitMessage = `Initial commit from turbokit`;
    logger.debug(`Running git commit -m "${commitMessage}"`);
    const commitResult = await $`git commit -m ${commitMessage}`.cwd(cwd).quiet();
    if (commitResult.exitCode !== 0) {
      throw new Error(`git commit failed: ${commitResult.stderr.toString()}`);
    }

    logger.debug('Git repository initialized successfully');
  } catch (error) {
    // Log the error but don't rethrow - git init failure shouldn't fail the whole process
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to initialize git repository: ${message}`);
    logger.warn(
      'You can initialize the repository manually with: git init && git add . && git commit -m "Initial commit"'
    );
  }
}
