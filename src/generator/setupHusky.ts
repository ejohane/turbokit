/**
 * Husky git hooks setup
 * Initializes Husky and ensures hooks are executable
 */

import { join } from 'node:path';
import { chmod } from 'node:fs/promises';
import { $ } from 'bun';
import type { Logger } from '../utils/logger';
import { exists } from '../utils/fs';

export interface HuskyOptions {
  /** Project directory */
  cwd: string;
  /** Enable verbose logging */
  verbose: boolean;
  /** Logger instance */
  logger: Logger;
}

/**
 * Set up Husky git hooks in the project
 *
 * Prerequisites:
 * - node_modules must exist (bun install must run first)
 * - .husky directory with pre-commit hook should already be copied by template system
 *
 * This function:
 * 1. Runs `bunx husky install` to initialize .husky directory
 * 2. Ensures .husky/pre-commit is executable
 */
export async function setupHusky(options: HuskyOptions): Promise<void> {
  const { cwd, verbose, logger } = options;

  // Check that node_modules exists (bun install must run first)
  const nodeModulesPath = join(cwd, 'node_modules');
  if (!(await exists(nodeModulesPath))) {
    logger.warn(
      'node_modules not found. Run `bun install` before setting up Husky.'
    );
    return;
  }

  // Run husky install to set up the hooks
  try {
    logger.debug('Running bunx husky install...');

    const result = await $`bunx husky install`.cwd(cwd).quiet();

    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString();
      logger.warn(`Husky install returned non-zero exit code: ${stderr}`);
      // Don't throw - graceful handling
      return;
    }

    if (verbose) {
      logger.debug('Husky installed successfully');
    }
  } catch (error) {
    // Graceful handling - warn but don't block
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Husky setup failed: ${message}`);
    logger.debug('You can manually run `bunx husky install` later');
    return;
  }

  // Ensure pre-commit hook is executable
  const preCommitPath = join(cwd, '.husky', 'pre-commit');
  try {
    if (await exists(preCommitPath)) {
      await chmod(preCommitPath, 0o755);
      logger.debug('Made .husky/pre-commit executable');
    } else {
      logger.debug('No pre-commit hook found at .husky/pre-commit');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to make pre-commit executable: ${message}`);
    // Don't throw - this is non-critical
  }
}
