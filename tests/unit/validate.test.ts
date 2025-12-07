/**
 * Unit tests for configuration validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { validateConfig, formatValidationErrors } from '../../src/generator/validate';
import type { ProjectConfig, CLIFlags, ValidationError } from '../../src/types/config';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('validateConfig', () => {
  let tempDir: string;

  // Create a temp directory for tests that need filesystem
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'turbokit-validate-test-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Helper to create a valid config
  function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
    return {
      projectName: 'test-project',
      projectPath: join(tempDir, 'test-project'),
      scope: 'test-project',
      modules: {
        web: true,
        mobile: false,
        api: false,
        storybook: false,
        ui: false,
      },
      ...overrides,
    };
  }

  // Helper to create default flags
  function createFlags(overrides: Partial<CLIFlags> = {}): CLIFlags {
    return {
      name: undefined,
      path: undefined,
      web: false,
      mobile: false,
      api: false,
      storybook: false,
      ui: false,
      yes: false,
      dryRun: false,
      verbose: false,
      force: false,
      ...overrides,
    };
  }

  describe('project name validation', () => {
    it('accepts valid kebab-case name', async () => {
      const config = createConfig({ projectName: 'my-cool-project' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'projectName')).toHaveLength(0);
    });

    it('accepts valid lowercase name', async () => {
      const config = createConfig({ projectName: 'myproject' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'projectName')).toHaveLength(0);
    });

    it('accepts name with numbers', async () => {
      const config = createConfig({ projectName: 'project123' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'projectName')).toHaveLength(0);
    });

    it('rejects empty project name', async () => {
      const config = createConfig({ projectName: '' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.some((e) => e.field === 'projectName')).toBe(true);
    });

    it('rejects name starting with dot', async () => {
      const config = createConfig({ projectName: '.hidden-project' });
      const errors = await validateConfig(config, createFlags());
      expect(
        errors.some((e) => e.field === 'projectName' && e.message.includes('dot'))
      ).toBe(true);
    });

    it('rejects name starting with underscore', async () => {
      const config = createConfig({ projectName: '_internal-project' });
      const errors = await validateConfig(config, createFlags());
      expect(
        errors.some((e) => e.field === 'projectName' && e.message.includes('underscore'))
      ).toBe(true);
    });

    it('rejects name with uppercase letters', async () => {
      const config = createConfig({ projectName: 'MyProject' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.some((e) => e.field === 'projectName')).toBe(true);
    });

    it('rejects name with spaces', async () => {
      const config = createConfig({ projectName: 'my project' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.some((e) => e.field === 'projectName')).toBe(true);
    });
  });

  describe('project path validation', () => {
    it('accepts valid non-existing path', async () => {
      const config = createConfig({
        projectPath: join(tempDir, 'new-project'),
      });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'projectPath')).toHaveLength(0);
    });

    it('accepts empty directory', async () => {
      const emptyDir = join(tempDir, 'empty-dir');
      await mkdir(emptyDir);

      const config = createConfig({ projectPath: emptyDir });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'projectPath')).toHaveLength(0);
    });

    it('rejects non-empty directory without --force', async () => {
      const nonEmptyDir = join(tempDir, 'non-empty');
      await mkdir(nonEmptyDir);
      await writeFile(join(nonEmptyDir, 'file.txt'), 'content');

      const config = createConfig({ projectPath: nonEmptyDir });
      const errors = await validateConfig(config, createFlags());
      expect(
        errors.some(
          (e) => e.field === 'projectPath' && e.message.includes('not empty')
        )
      ).toBe(true);
    });

    it('accepts non-empty directory with --force', async () => {
      const nonEmptyDir = join(tempDir, 'non-empty-force');
      await mkdir(nonEmptyDir);
      await writeFile(join(nonEmptyDir, 'file.txt'), 'content');

      const config = createConfig({ projectPath: nonEmptyDir });
      const errors = await validateConfig(config, createFlags({ force: true }));
      expect(errors.filter((e) => e.field === 'projectPath')).toHaveLength(0);
    });

    it('rejects empty project path', async () => {
      const config = createConfig({ projectPath: '' });
      const errors = await validateConfig(config, createFlags());
      expect(errors.some((e) => e.field === 'projectPath')).toBe(true);
    });

    it('rejects path with non-existent parent', async () => {
      const config = createConfig({
        projectPath: '/non/existent/parent/project',
      });
      const errors = await validateConfig(config, createFlags());
      expect(
        errors.some(
          (e) =>
            e.field === 'projectPath' &&
            e.message.includes('Parent directory does not exist')
        )
      ).toBe(true);
    });
  });

  describe('module selection validation', () => {
    it('accepts when at least one app module is selected', async () => {
      const config = createConfig({
        modules: {
          web: true,
          mobile: false,
          api: false,
          storybook: false,
          ui: false,
        },
      });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'modules')).toHaveLength(0);
    });

    it('rejects when no app modules are selected', async () => {
      const config = createConfig({
        modules: {
          web: false,
          mobile: false,
          api: false,
          storybook: false,
          ui: true, // UI alone is not an app
        },
      });
      const errors = await validateConfig(config, createFlags());
      expect(
        errors.some(
          (e) =>
            e.field === 'modules' &&
            e.message.includes('At least one app module')
        )
      ).toBe(true);
    });

    it('accepts multiple app modules', async () => {
      const config = createConfig({
        modules: {
          web: true,
          mobile: true,
          api: true,
          storybook: false,
          ui: true,
        },
      });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'modules')).toHaveLength(0);
    });

    it('accepts api-only project', async () => {
      const config = createConfig({
        modules: {
          web: false,
          mobile: false,
          api: true,
          storybook: false,
          ui: false,
        },
      });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'modules')).toHaveLength(0);
    });

    it('accepts storybook-only project', async () => {
      const config = createConfig({
        modules: {
          web: false,
          mobile: false,
          api: false,
          storybook: true,
          ui: false,
        },
      });
      const errors = await validateConfig(config, createFlags());
      expect(errors.filter((e) => e.field === 'modules')).toHaveLength(0);
    });
  });
});

describe('formatValidationErrors', () => {
  it('returns empty string for no errors', () => {
    expect(formatValidationErrors([])).toBe('');
  });

  it('formats single error correctly', () => {
    const errors: ValidationError[] = [
      { field: 'projectName', message: 'Project name is required' },
    ];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('Project name is required');
  });

  it('formats error with suggestion', () => {
    const errors: ValidationError[] = [
      {
        field: 'projectPath',
        message: 'Directory already exists',
        suggestion: 'Use --force to overwrite',
      },
    ];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('Directory already exists');
    expect(formatted).toContain('Use --force to overwrite');
  });

  it('formats multiple errors', () => {
    const errors: ValidationError[] = [
      { field: 'projectName', message: 'Invalid project name' },
      { field: 'projectPath', message: 'Path does not exist' },
    ];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('Invalid project name');
    expect(formatted).toContain('Path does not exist');
  });
});
