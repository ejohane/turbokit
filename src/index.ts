/**
 * Main entry point for the turbokit CLI
 */

import { parseArgs } from './cli/parseArgs';
import { promptForConfig } from './cli/prompts';
import { validateConfig, formatValidationErrors } from './generator/validate';
import { generate } from './generator/generate';
import { printDryRun } from './cli/dryRun';
import { printSummary } from './cli/summary';
import { createLogger } from './utils/logger';
import {
  isTurbokitError,
  OperationCancelledError,
} from './utils/errors';

export async function main(argv: string[]): Promise<void> {
  // Track verbose mode for error handling (default false until args parsed)
  let verbose = false;

  try {
    // 1. Parse command line arguments
    const flags = await parseArgs(argv);
    verbose = flags.verbose;

    // 2. Create logger with verbose mode support
    const logger = createLogger(verbose);

    logger.debug('Parsed flags: ' + JSON.stringify(flags, null, 2));

    // 3. Gather project configuration (interactive or from flags)
    const config = await promptForConfig(flags);

    logger.debug('Project config: ' + JSON.stringify(config, null, 2));

    // 4. Validate configuration
    const validationErrors = await validateConfig(config, flags);
    
    if (validationErrors.length > 0) {
      logger.error('Configuration validation failed:');
      console.error(formatValidationErrors(validationErrors));
      process.exit(1);
    }

    logger.success('Configuration validated');

    // 5. Generate project or show dry-run
    if (flags.dryRun) {
      printDryRun(config);
    } else {
      await generate({ config, flags, logger });
      printSummary(config, logger);
    }

  } catch (error) {
    handleError(error, verbose);
  }
}

/**
 * Handle errors with user-friendly messages
 */
function handleError(error: unknown, verbose: boolean): never {
  // Handle user cancellation (Ctrl+C or prompt cancellation)
  if (error instanceof OperationCancelledError) {
    console.log(error.message);
    process.exit(error.exitCode);
  }

  // Handle inquirer ExitPromptError (user pressed Ctrl+C)
  if (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('User force closed'))
  ) {
    console.log('\nOperation cancelled.');
    process.exit(0);
  }

  // Handle TurbokitError with formatted output
  if (isTurbokitError(error)) {
    console.error(`\n${error.format(verbose)}\n`);
    process.exit(error.exitCode);
  }

  // Handle standard errors
  if (error instanceof Error) {
    console.error('\nError:', error.message);
    if (verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }

  // Handle unknown errors
  console.error('\nAn unexpected error occurred');
  if (verbose) {
    console.error(error);
  }
  process.exit(1);
}
