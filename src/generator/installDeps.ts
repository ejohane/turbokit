/**
 * Dependency installer module
 * Runs `bun install` in the generated project directory
 */

import { $ } from 'bun';
import type { Logger } from '../utils/logger';

/**
 * Options for installing dependencies
 */
export interface InstallOptions {
  /** Project directory where bun install should run */
  cwd: string;
  /** Show install output */
  verbose: boolean;
  /** Logger instance for output */
  logger: Logger;
}

/**
 * Check if bun is available in the system
 */
async function checkBunInstalled(): Promise<boolean> {
  try {
    const result = await $`bun --version`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Install dependencies using bun install
 *
 * @param options - Installation options
 * @throws Error if bun is not installed or installation fails
 */
export async function installDeps(options: InstallOptions): Promise<void> {
  const { cwd, verbose, logger } = options;

  logger.debug(`Checking if bun is installed...`);

  // Check if bun is available
  const bunInstalled = await checkBunInstalled();
  if (!bunInstalled) {
    throw new Error(
      'Bun is not installed. Please install Bun first: https://bun.sh'
    );
  }

  logger.debug(`Installing dependencies in ${cwd}`);

  try {
    if (verbose) {
      // In verbose mode, show the install output
      const result = await $`bun install`.cwd(cwd);
      if (result.exitCode !== 0) {
        throw new Error(`bun install failed with exit code ${result.exitCode}`);
      }
    } else {
      // In quiet mode, suppress output
      const result = await $`bun install`.cwd(cwd).quiet();
      if (result.exitCode !== 0) {
        // Even in quiet mode, show stderr on failure
        const stderr = result.stderr.toString();
        throw new Error(
          `bun install failed with exit code ${result.exitCode}${stderr ? `\n${stderr}` : ''}`
        );
      }
    }

    logger.success('Dependencies installed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to install dependencies: ${message}`);
    logger.info("Try running 'bun install' manually in the project directory");
    throw error;
  }
}
