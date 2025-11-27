/**
 * Main entry point for the turbokit CLI
 */

import { parseArgs } from './cli/parseArgs';
import { promptForConfig } from './cli/prompts';
import { validateConfig, formatValidationErrors } from './generator/validate';
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
      logger.info('Dry-run mode: would generate the following structure:');
      printDryRun(config);
    } else {
      logger.info('Project generation not yet implemented');
      logger.info('Config validated successfully!');
      // TODO: Implement generation
      // await generate(config, flags, logger);
    }

    // 6. Print summary
    // TODO: Implement summary
    // printSummary(config, logger);

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

/**
 * Print a dry-run preview of the project structure
 */
function printDryRun(config: any): void {
  console.log(`\n${config.projectName}/`);
  console.log('├── apps/');
  if (config.modules.web) console.log('│   ├── web/');
  if (config.modules.mobile) console.log('│   ├── mobile/');
  if (config.modules.api) console.log('│   ├── api/');
  if (config.modules.storybook) console.log('│   └── storybook/');
  console.log('├── packages/');
  console.log('│   ├── config/');
  if (config.modules.ui) console.log('│   └── ui/');
  console.log('├── .github/');
  console.log('│   └── workflows/');
  console.log('│       └── ci.yml');
  console.log('├── .husky/');
  console.log('│   └── pre-commit');
  console.log('├── package.json');
  console.log('├── tsconfig.json');
  console.log('├── turbo.json');
  console.log('├── README.md');
  console.log('├── AGENTS.md');
  console.log('├── .gitignore');
  console.log('└── .editorconfig');
  console.log('');
}
