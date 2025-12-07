/**
 * Print summary of generated project
 */

import { basename, dirname } from 'node:path';
import type { ProjectConfig } from '../types/config';
import type { Logger } from '../utils/logger';

/**
 * Print a summary after project generation completes
 */
export function printSummary(config: ProjectConfig, logger: Logger): void {
  const { modules, projectName, projectPath } = config;

  console.log('');
  logger.success(`Created project "${projectName}" at ${projectPath}`);
  console.log('');

  // Show included modules
  console.log('Included modules:');
  if (modules.web) {
    console.log('  ✓ Web app (apps/web)');
  }
  if (modules.api) {
    console.log('  ✓ API server (apps/api)');
  }
  if (modules.mobile) {
    console.log('  ✓ Mobile app (apps/mobile)');
  }
  if (modules.storybook) {
    console.log('  ✓ Storybook (apps/storybook)');
  }
  if (modules.ui) {
    console.log('  ✓ UI package (packages/ui)');
  }
  console.log('  ✓ Config package (packages/config)');
  console.log('');

  // Determine cd command based on whether projectPath is in current dir
  const cwd = process.cwd();
  const parentDir = dirname(projectPath);
  const cdCommand = parentDir === cwd ? projectName : projectPath;

  console.log('Next steps:');
  console.log(`  cd ${cdCommand}`);
  console.log('  bun dev');
  console.log('');
  console.log('Available commands:');
  console.log('  bun dev        Start development servers');
  console.log('  bun build      Build all packages');
  console.log('  bun lint       Run linting');
  console.log('  bun test       Run tests');
  console.log('  bun typecheck  Check TypeScript types');
  console.log('');
}
