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
  if (modules.api) steps++;
  if (modules.storybook) steps++;
  if (modules.ui) steps++;

  return steps;
}

/**
 * Run a shell command using Bun.spawn
 */
async function runCommand(
  command: string[],
  cwd: string,
  logger: Logger
): Promise<void> {
  logger.debug(`Running: ${command.join(' ')}`);

  const proc = Bun.spawn(command, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Command failed: ${command.join(' ')}\n${stderr}`);
  }
}

/**
 * Add UI package dependency to a package.json file
 */
async function addUiDependency(
  packageJsonPath: string,
  scope: string
): Promise<void> {
  const content = await readFile(packageJsonPath);
  const pkg = JSON.parse(content);

  // Add UI dependency
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies[`@${scope}/ui`] = 'workspace:*';

  // Sort dependencies alphabetically
  const sortedDeps = Object.fromEntries(
    Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b))
  );
  pkg.dependencies = sortedDeps;

  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
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

  try {
    // Step 1: Create project directory
    currentStep++;
    logger.step(currentStep, totalSteps, 'Creating project directory');

    if (await exists(projectPath)) {
      if (!flags.force) {
        throw new Error(
          `Directory already exists: ${projectPath}\nUse --force to overwrite.`
        );
      }
      logger.warn('Overwriting existing directory');
      await removeDir(projectPath);
    }
    await mkdir(projectPath);

    // Step 2: Copy root templates
    currentStep++;
    logger.step(currentStep, totalSteps, 'Copying root templates');
    await copyTemplate(
      join(templatesDir, 'root'),
      projectPath,
      copyOptions
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
      await copyTemplate(
        join(templatesDir, 'apps', 'web'),
        join(projectPath, 'apps', 'web'),
        copyOptions
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
      await copyTemplate(
        join(templatesDir, 'apps', 'mobile'),
        join(projectPath, 'apps', 'mobile'),
        copyOptions
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
