/**
 * Print summary of generated project
 */

import type { ProjectConfig } from '../types/config';
import type { Logger } from '../utils/logger';

/**
 * Print a summary after project generation completes
 */
export function printSummary(config: ProjectConfig, logger: Logger): void {
  console.log('');
  logger.success('Project generated successfully!');
  console.log('');
  console.log(`  Project: ${logger.bold(config.projectName)}`);
  console.log(`  Path:    ${config.projectPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('');
  console.log(`  cd ${config.projectName}`);
  console.log('  bun install');
  console.log('  bun dev');
  console.log('');
  console.log('Available commands:');
  console.log('  bun dev        - Start development servers');
  console.log('  bun build      - Build all packages and apps');
  console.log('  bun test       - Run tests');
  console.log('  bun lint       - Lint code');
  console.log('  bun typecheck  - Type check code');
  console.log('');
}
