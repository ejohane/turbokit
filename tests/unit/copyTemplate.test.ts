/**
 * Unit tests for template copying logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { copyTemplate, defaultTransformFileName } from '../../src/generator/copyTemplate';
import type { TemplateVariables } from '../../src/types/config';
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create test variables
function createTestVariables(): TemplateVariables {
  return {
    projectName: 'test-project',
    scope: 'test-project',
    year: '2024',
    reactVersion: '^18.2.0',
    typescriptVersion: '^5.3.0',
    viteVersion: '^5.0.0',
    expoVersion: '~50.0.0',
    honoVersion: '^4.0.0',
    storybookVersion: '^8.0.0',
    vitestVersion: '^2.0.0',
    turboVersion: '^2.0.0',
    eslintVersion: '^9.0.0',
    prettierVersion: '^3.0.0',
    huskyVersion: '^9.0.0',
  };
}

describe('defaultTransformFileName', () => {
  it('removes .template extension', () => {
    expect(defaultTransformFileName('package.json.template')).toBe('package.json');
    expect(defaultTransformFileName('index.ts.template')).toBe('index.ts');
  });

  it('keeps filename unchanged if no .template extension', () => {
    expect(defaultTransformFileName('README.md')).toBe('README.md');
    expect(defaultTransformFileName('config.json')).toBe('config.json');
  });

  it('only removes trailing .template', () => {
    expect(defaultTransformFileName('template.txt')).toBe('template.txt');
    // Note: '.template' alone removes the extension leaving empty string
    expect(defaultTransformFileName('.template')).toBe('');
  });
});

describe('copyTemplate', () => {
  let tempDir: string;
  let srcDir: string;
  let destDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'turbokit-copy-test-'));
    srcDir = join(tempDir, 'src');
    destDir = join(tempDir, 'dest');
    await mkdir(srcDir);
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('basic copying', () => {
    it('copies a single file with variable replacement', async () => {
      await writeFile(
        join(srcDir, 'package.json.template'),
        '{"name": "{{projectName}}"}'
      );

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(join(destDir, 'package.json'));

      const content = await readFile(join(destDir, 'package.json'), 'utf-8');
      expect(content).toBe('{"name": "test-project"}');
    });

    it('copies multiple files', async () => {
      await writeFile(join(srcDir, 'file1.template'), 'content1');
      await writeFile(join(srcDir, 'file2.template'), 'content2');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
      });

      expect(result).toHaveLength(2);
      expect(await readFile(join(destDir, 'file1'), 'utf-8')).toBe('content1');
      expect(await readFile(join(destDir, 'file2'), 'utf-8')).toBe('content2');
    });

    it('copies nested directories', async () => {
      await mkdir(join(srcDir, 'sub'));
      await writeFile(join(srcDir, 'root.template'), 'root');
      await writeFile(join(srcDir, 'sub', 'nested.template'), 'nested');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
      });

      expect(result).toHaveLength(2);
      expect(await readFile(join(destDir, 'root'), 'utf-8')).toBe('root');
      expect(await readFile(join(destDir, 'sub', 'nested'), 'utf-8')).toBe('nested');
    });
  });

  describe('variable replacement', () => {
    it('replaces all variables in file content', async () => {
      await writeFile(
        join(srcDir, 'config.template'),
        `name: {{projectName}}
scope: @{{scope}}
year: {{year}}
react: {{reactVersion}}`
      );

      await copyTemplate(srcDir, destDir, { variables: createTestVariables() });

      const content = await readFile(join(destDir, 'config'), 'utf-8');
      expect(content).toContain('name: test-project');
      expect(content).toContain('scope: @test-project');
      expect(content).toContain('year: 2024');
      expect(content).toContain('react: ^18.2.0');
    });
  });

  describe('exclusion patterns', () => {
    it('excludes node_modules by default', async () => {
      await mkdir(join(srcDir, 'node_modules'));
      await writeFile(join(srcDir, 'node_modules', 'pkg.json'), 'ignored');
      await writeFile(join(srcDir, 'keep.template'), 'kept');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('keep');
    });

    it('excludes .git by default', async () => {
      await mkdir(join(srcDir, '.git'));
      await writeFile(join(srcDir, '.git', 'config'), 'ignored');
      await writeFile(join(srcDir, 'keep.template'), 'kept');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
      });

      expect(result).toHaveLength(1);
    });

    it('excludes custom patterns', async () => {
      await writeFile(join(srcDir, 'include.template'), 'yes');
      await writeFile(join(srcDir, 'exclude.test.template'), 'no');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
        exclude: ['node_modules', '.git', '*.test.template'],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('include');
    });
  });

  describe('inclusion patterns', () => {
    it('only copies files matching include patterns', async () => {
      await writeFile(join(srcDir, 'main.ts.template'), 'ts');
      await writeFile(join(srcDir, 'styles.css.template'), 'css');
      await writeFile(join(srcDir, 'image.png'), 'png');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
        include: ['*.ts.template'],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('main.ts');
    });
  });

  describe('dry run mode', () => {
    it('returns file list but does not create files', async () => {
      await writeFile(join(srcDir, 'file.template'), 'content');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
        dryRun: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(join(destDir, 'file'));

      // Verify no files were created
      const entries = await readdir(tempDir);
      expect(entries).not.toContain('dest');
    });
  });

  describe('custom filename transformation', () => {
    it('uses custom transform function', async () => {
      await writeFile(join(srcDir, 'FILE.TXT'), 'content');

      const result = await copyTemplate(srcDir, destDir, {
        variables: createTestVariables(),
        transformFileName: (name) => name.toLowerCase(),
      });

      expect(result[0]).toBe(join(destDir, 'file.txt'));
    });
  });
});
