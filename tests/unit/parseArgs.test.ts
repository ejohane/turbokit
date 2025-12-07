/**
 * Unit tests for CLI argument parser
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { parseArgs } from '../../src/cli/parseArgs';

describe('parseArgs', () => {
  // Store original process.exit and console methods
  const originalExit = process.exit;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Mock process.exit to prevent test termination
    process.exit = mock(() => {
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit;
    console.log = mock(() => {});
    console.error = mock(() => {});
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('default values', () => {
    it('returns default flags when no arguments provided', async () => {
      const flags = await parseArgs([]);

      expect(flags).toEqual({
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
      });
    });
  });

  describe('string options', () => {
    it('parses --name flag', async () => {
      const flags = await parseArgs(['--name', 'my-project']);
      expect(flags.name).toBe('my-project');
    });

    it('parses --path flag', async () => {
      const flags = await parseArgs(['--path', './custom/path']);
      expect(flags.path).toBe('./custom/path');
    });

    it('handles name with hyphens', async () => {
      const flags = await parseArgs(['--name', 'my-cool-project']);
      expect(flags.name).toBe('my-cool-project');
    });
  });

  describe('boolean module flags', () => {
    it('parses --web flag', async () => {
      const flags = await parseArgs(['--web']);
      expect(flags.web).toBe(true);
    });

    it('parses --mobile flag', async () => {
      const flags = await parseArgs(['--mobile']);
      expect(flags.mobile).toBe(true);
    });

    it('parses --api flag', async () => {
      const flags = await parseArgs(['--api']);
      expect(flags.api).toBe(true);
    });

    it('parses --storybook flag', async () => {
      const flags = await parseArgs(['--storybook']);
      expect(flags.storybook).toBe(true);
    });

    it('parses --ui flag', async () => {
      const flags = await parseArgs(['--ui']);
      expect(flags.ui).toBe(true);
    });

    it('parses multiple module flags', async () => {
      const flags = await parseArgs(['--web', '--api', '--ui']);
      expect(flags.web).toBe(true);
      expect(flags.api).toBe(true);
      expect(flags.ui).toBe(true);
      expect(flags.mobile).toBe(false);
      expect(flags.storybook).toBe(false);
    });
  });

  describe('control flags', () => {
    it('parses --yes flag', async () => {
      const flags = await parseArgs(['--yes']);
      expect(flags.yes).toBe(true);
    });

    it('parses -y short alias', async () => {
      const flags = await parseArgs(['-y']);
      expect(flags.yes).toBe(true);
    });

    it('parses --dry-run flag', async () => {
      const flags = await parseArgs(['--dry-run']);
      expect(flags.dryRun).toBe(true);
    });

    it('parses --verbose flag', async () => {
      const flags = await parseArgs(['--verbose']);
      expect(flags.verbose).toBe(true);
    });

    it('parses -v short alias', async () => {
      const flags = await parseArgs(['-v']);
      expect(flags.verbose).toBe(true);
    });

    it('parses --force flag', async () => {
      const flags = await parseArgs(['--force']);
      expect(flags.force).toBe(true);
    });

    it('parses -f short alias', async () => {
      const flags = await parseArgs(['-f']);
      expect(flags.force).toBe(true);
    });
  });

  describe('combined flags', () => {
    it('parses full command line example', async () => {
      const flags = await parseArgs([
        '--name',
        'my-app',
        '--path',
        './projects/my-app',
        '--web',
        '--api',
        '--ui',
        '-y',
        '-v',
      ]);

      expect(flags.name).toBe('my-app');
      expect(flags.path).toBe('./projects/my-app');
      expect(flags.web).toBe(true);
      expect(flags.api).toBe(true);
      expect(flags.ui).toBe(true);
      expect(flags.yes).toBe(true);
      expect(flags.verbose).toBe(true);
      expect(flags.mobile).toBe(false);
      expect(flags.storybook).toBe(false);
      expect(flags.dryRun).toBe(false);
      expect(flags.force).toBe(false);
    });

    it('parses dry-run example', async () => {
      const flags = await parseArgs([
        '--name',
        'test-project',
        '--web',
        '--mobile',
        '--dry-run',
      ]);

      expect(flags.name).toBe('test-project');
      expect(flags.web).toBe(true);
      expect(flags.mobile).toBe(true);
      expect(flags.dryRun).toBe(true);
    });
  });

  describe('help and version flags', () => {
    it('--help prints help and exits', async () => {
      expect(parseArgs(['--help'])).rejects.toThrow('process.exit called');
      expect(console.log).toHaveBeenCalled();
    });

    it('-h prints help and exits', async () => {
      expect(parseArgs(['-h'])).rejects.toThrow('process.exit called');
      expect(console.log).toHaveBeenCalled();
    });

    it('--version prints version and exits', async () => {
      expect(parseArgs(['--version'])).rejects.toThrow('process.exit called');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('unknown flags', () => {
    it('exits with error on unknown flag', async () => {
      expect(parseArgs(['--unknown'])).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('exits with error on unknown short flag', async () => {
      expect(parseArgs(['-x'])).rejects.toThrow('process.exit called');
      expect(console.error).toHaveBeenCalled();
    });

    it('ignores positional arguments (non-flag)', async () => {
      // Non-flag arguments are ignored, not treated as errors
      const flags = await parseArgs(['some-positional-arg', '--web']);
      expect(flags.web).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty string name', async () => {
      const flags = await parseArgs(['--name', '']);
      expect(flags.name).toBe('');
    });

    it('handles flags in any order', async () => {
      const flags = await parseArgs(['--web', '--name', 'test', '-y', '--api']);
      expect(flags.name).toBe('test');
      expect(flags.web).toBe(true);
      expect(flags.api).toBe(true);
      expect(flags.yes).toBe(true);
    });
  });
});
