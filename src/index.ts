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

export async function main(argv: string[]): Promise<void> {
  try {
    // 1. Parse command line arguments
    const flags = await parseArgs(argv);

    // 2. Create logger with verbose mode support
    const logger = createLogger(flags.verbose);

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
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error('An unexpected error occurred');
    }
    process.exit(1);
  }
}
