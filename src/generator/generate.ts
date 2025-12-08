/**
 * Main generator orchestrator
 * Coordinates all generation steps for creating a new project
 */

import { dirname, join } from 'node:path';
import { chmod } from 'node:fs/promises';
import type { ProjectConfig, CLIFlags } from '../types/config';
import type { Logger } from '../utils/logger';
import { copyTemplate } from './copyTemplate';
import { buildVariables } from './applyVariables';
import { mkdir, exists, removeDir, readFile, writeFile } from '../utils/fs';
import {
  DirectoryExistsError,
  wrapCommandError,
  wrapFileSystemError,
} from '../utils/errors';

/** Templates directory relative to this file */
const templatesDir = join(dirname(dirname(dirname(import.meta.path))), 'templates');

export interface GenerateOptions {
  config: ProjectConfig;
  flags: CLIFlags;
  logger: Logger;
}

/**
 * Calculate total number of generation steps based on selected modules
 */
function calculateTotalSteps(modules: ProjectConfig['modules']): number {
  let steps = 8; // Base steps: create dir, root, config package, husky, pipelines, git init, install deps, initial commit

  if (modules.web) steps++;
  if (modules.mobile) steps++;
  if (modules.api) {
    steps++; // API app
    steps++; // api-client package
  }
  if (modules.storybook) steps++;
  if (modules.ui) steps++;

  return steps;
}

/**
 * Run a shell command using Bun.spawn
 * @throws {TurbokitError} On command failure with actionable suggestions
 */
async function runCommand(
  command: string[],
  cwd: string,
  logger: Logger
): Promise<void> {
  const commandStr = command.join(' ');
  logger.debug(`Running: ${commandStr}`);

  const proc = Bun.spawn(command, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw wrapCommandError(commandStr, exitCode, stderr);
  }
}

/**
 * Add UI package dependency to a package.json file
 * @throws {TurbokitError} On file read/write failure
 */
async function addUiDependency(
  packageJsonPath: string,
  scope: string
): Promise<void> {
  let content: string;
  try {
    content = await readFile(packageJsonPath);
  } catch (error) {
    throw wrapFileSystemError(error, packageJsonPath, 'read');
  }

  const pkg = JSON.parse(content);

  // Add UI dependency
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies[`@${scope}/ui`] = 'workspace:*';

  // Sort dependencies alphabetically
  const sortedDeps = Object.fromEntries(
    Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b))
  );
  pkg.dependencies = sortedDeps;

  try {
    await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (error) {
    throw wrapFileSystemError(error, packageJsonPath, 'write');
  }
}

/**
 * Main generator orchestrator
 * Coordinates all generation steps
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const { config, flags, logger } = options;
  const { projectPath, modules } = config;

  const totalSteps = calculateTotalSteps(modules);
  let currentStep = 0;

  const variables = buildVariables(config);

  const copyOptions = {
    variables,
    dryRun: false,
  };

  // Determine variant based on API selection
  // Note: The variant name is 'api' - the '.with-' prefix is part of the filename pattern
  // e.g., 'App.with-api.tsx.template' uses variant='api' to become 'App.tsx'
  const apiVariant = modules.api ? 'api' : undefined;

  try {
    // Step 1: Create project directory
    currentStep++;
    logger.step(currentStep, totalSteps, 'Creating project directory');

    if (await exists(projectPath)) {
      if (!flags.force) {
        throw new DirectoryExistsError(projectPath);
      }
      logger.warn('Overwriting existing directory');
      try {
        await removeDir(projectPath);
      } catch (error) {
        throw wrapFileSystemError(error, projectPath, 'remove directory');
      }
    }
    try {
      await mkdir(projectPath);
    } catch (error) {
      throw wrapFileSystemError(error, projectPath, 'create directory');
    }

    // Step 2: Copy root templates
    currentStep++;
    logger.step(currentStep, totalSteps, 'Copying root templates');
    await copyTemplate(
      join(templatesDir, 'root'),
      projectPath,
      {
        ...copyOptions,
        variant: apiVariant,
      }
    );

    // Step 3: Copy config package
    currentStep++;
    logger.step(currentStep, totalSteps, 'Setting up config package');
    await copyTemplate(
      join(templatesDir, 'packages', 'config'),
      join(projectPath, 'packages', 'config'),
      copyOptions
    );

    // Step 4: Copy selected apps
    if (modules.web) {
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up web app');

      // Determine which files to exclude based on API selection
      const webExclude = ['node_modules', '.git'];
      if (!modules.api) {
        // Exclude API-specific files when API is not selected
        webExclude.push('api');
        webExclude.push('.env.example.template');
      }

      await copyTemplate(
        join(templatesDir, 'apps', 'web'),
        join(projectPath, 'apps', 'web'),
        {
          ...copyOptions,
          exclude: webExclude,
          variant: apiVariant,
        }
      );
      // Add UI dependency if UI package is also selected
      if (modules.ui) {
        await addUiDependency(
          join(projectPath, 'apps', 'web', 'package.json'),
          config.scope
        );
      }
    }

    if (modules.mobile) {
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up mobile app');

      // Determine which files to exclude based on API selection
      const mobileExclude = ['node_modules', '.git', 'app.json.template'];
      if (!modules.api) {
        // Exclude API-specific files when API is not selected
        mobileExclude.push('api');
        mobileExclude.push('config');
        mobileExclude.push('.env.example.template');
      }

      await copyTemplate(
        join(templatesDir, 'apps', 'mobile'),
        join(projectPath, 'apps', 'mobile'),
        {
          ...copyOptions,
          exclude: mobileExclude,
          variant: apiVariant,
        }
      );
    }

    if (modules.api) {
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up API server');
      await copyTemplate(
        join(templatesDir, 'apps', 'api'),
        join(projectPath, 'apps', 'api'),
        copyOptions
      );

      // Also copy the api-client package when API is selected
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up API client package');
      await copyTemplate(
        join(templatesDir, 'packages', 'api-client'),
        join(projectPath, 'packages', 'api-client'),
        copyOptions
      );
    }

    if (modules.storybook) {
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up Storybook');
      await copyTemplate(
        join(templatesDir, 'apps', 'storybook'),
        join(projectPath, 'apps', 'storybook'),
        copyOptions
      );
    }

    // Step 5: Copy UI package (if selected)
    if (modules.ui) {
      currentStep++;
      logger.step(currentStep, totalSteps, 'Setting up UI package');
      await copyTemplate(
        join(templatesDir, 'packages', 'ui'),
        join(projectPath, 'packages', 'ui'),
        copyOptions
      );
    }

    // Step 6: Copy husky hooks
    currentStep++;
    logger.step(currentStep, totalSteps, 'Setting up git hooks');
    await copyTemplate(
      join(templatesDir, 'husky'),
      join(projectPath, '.husky'),
      copyOptions
    );
    // Make pre-commit executable
    const preCommitPath = join(projectPath, '.husky', 'pre-commit');
    if (await exists(preCommitPath)) {
      await chmod(preCommitPath, 0o755);
    }

    // Step 7: Copy CI pipeline
    currentStep++;
    logger.step(currentStep, totalSteps, 'Setting up CI pipeline');
    await copyTemplate(
      join(templatesDir, 'pipelines'),
      join(projectPath, '.github', 'workflows'),
      copyOptions
    );

    // Step 8: Initialize git repository (must happen before bun install for husky)
    currentStep++;
    logger.step(currentStep, totalSteps, 'Initializing git repository');
    await runCommand(['git', 'init'], projectPath, logger);

    // Step 9: Install dependencies (husky prepare script needs git)
    currentStep++;
    logger.step(currentStep, totalSteps, 'Installing dependencies');
    await runCommand(['bun', 'install'], projectPath, logger);

    // Step 10: Create initial commit (skip hooks for clean initial state)
    currentStep++;
    logger.step(currentStep, totalSteps, 'Creating initial commit');
    await runCommand(['git', 'add', '.'], projectPath, logger);
    await runCommand(
      ['git', 'commit', '--no-verify', '-m', 'Initial commit'],
      projectPath,
      logger
    );

    logger.success(`Project created at ${projectPath}`);
  } catch (error) {
    // Cleanup on failure
    logger.error('Generation failed, cleaning up...');
    try {
      if (await exists(projectPath)) {
        await removeDir(projectPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
