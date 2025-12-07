/**
 * Unit tests for custom error types
 */

import { describe, it, expect } from 'bun:test';
import {
  DirectoryExistsError,
  ParentDirectoryNotFoundError,
  PermissionDeniedError,
  TemplateNotFoundError,
  FileSystemError,
  InvalidProjectNameError,
  NoModulesSelectedError,
  GitNotInstalledError,
  GitOperationError,
  BunNotInstalledError,
  DependencyInstallError,
  CommandFailedError,
  OperationCancelledError,
  isTurbokitError,
  wrapFileSystemError,
  wrapCommandError,
} from '../../src/utils/errors';

describe('TurbokitError subclasses', () => {
  describe('DirectoryExistsError', () => {
    it('creates error with path', () => {
      const error = new DirectoryExistsError('/path/to/dir');
      expect(error.message).toBe('Directory already exists: /path/to/dir');
      expect(error.category).toBe('filesystem');
      expect(error.suggestion).toContain('--force');
      expect(error.path).toBe('/path/to/dir');
    });

    it('formats error message', () => {
      const error = new DirectoryExistsError('/my/path');
      const formatted = error.format(false);
      expect(formatted).toContain('Directory already exists');
      expect(formatted).toContain('--force');
    });
  });

  describe('ParentDirectoryNotFoundError', () => {
    it('creates error with paths and suggestion', () => {
      const error = new ParentDirectoryNotFoundError('/a/b/c', '/a/b');
      expect(error.message).toContain('/a/b');
      expect(error.category).toBe('filesystem');
      expect(error.suggestion).toContain('mkdir');
    });
  });

  describe('PermissionDeniedError', () => {
    it('creates error with path and operation', () => {
      const error = new PermissionDeniedError('/protected/file', 'write');
      expect(error.message).toContain('Permission denied');
      expect(error.message).toContain('write');
      expect(error.category).toBe('filesystem');
    });
  });

  describe('TemplateNotFoundError', () => {
    it('creates error with template path', () => {
      const error = new TemplateNotFoundError('/templates/missing');
      expect(error.message).toContain('Template not found');
      expect(error.suggestion).toContain('reinstalling');
    });
  });

  describe('InvalidProjectNameError', () => {
    it('creates error with invalid name', () => {
      const error = new InvalidProjectNameError('My Project');
      expect(error.message).toContain('Invalid project name');
      expect(error.message).toContain('My Project');
      expect(error.category).toBe('validation');
      expect(error.suggestion).toContain('kebab-case');
    });
  });

  describe('NoModulesSelectedError', () => {
    it('creates error with suggestion', () => {
      const error = new NoModulesSelectedError();
      expect(error.message).toContain('At least one app module');
      expect(error.suggestion).toContain('--web');
    });
  });

  describe('GitNotInstalledError', () => {
    it('creates platform-specific suggestion', () => {
      const error = new GitNotInstalledError();
      expect(error.message).toContain('Git is not installed');
      expect(error.category).toBe('git');
      // Suggestion varies by platform
      expect(error.suggestion).toBeDefined();
    });
  });

  describe('GitOperationError', () => {
    it('creates error with operation details', () => {
      const error = new GitOperationError('commit', 'nothing to commit');
      expect(error.message).toContain('Git commit failed');
      expect(error.category).toBe('git');
    });

    it('adds suggestion for common errors', () => {
      const error = new GitOperationError('status', 'not a git repository');
      expect(error.suggestion).toContain('git init');
    });
  });

  describe('BunNotInstalledError', () => {
    it('creates error with install instructions', () => {
      const error = new BunNotInstalledError();
      expect(error.message).toContain('Bun is not installed');
      expect(error.suggestion).toContain('bun.sh');
    });
  });

  describe('DependencyInstallError', () => {
    it('detects network errors', () => {
      const error = new DependencyInstallError('ENOTFOUND registry.npmjs.org');
      expect(error.suggestion).toContain('internet connection');
    });

    it('detects permission errors', () => {
      const error = new DependencyInstallError('EACCES permission denied');
      expect(error.suggestion).toContain('permissions');
    });
  });

  describe('OperationCancelledError', () => {
    it('has exit code 0', () => {
      const error = new OperationCancelledError();
      expect(error.exitCode).toBe(0);
      expect(error.category).toBe('cancelled');
    });

    it('uses custom message', () => {
      const error = new OperationCancelledError('User pressed Ctrl+C');
      expect(error.message).toBe('User pressed Ctrl+C');
    });
  });
});

describe('isTurbokitError', () => {
  it('returns true for TurbokitError instances', () => {
    expect(isTurbokitError(new DirectoryExistsError('/path'))).toBe(true);
    expect(isTurbokitError(new InvalidProjectNameError('bad'))).toBe(true);
    expect(isTurbokitError(new GitNotInstalledError())).toBe(true);
  });

  it('returns false for regular errors', () => {
    expect(isTurbokitError(new Error('regular error'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isTurbokitError('string')).toBe(false);
    expect(isTurbokitError(null)).toBe(false);
    expect(isTurbokitError(undefined)).toBe(false);
    expect(isTurbokitError({})).toBe(false);
  });
});

describe('wrapFileSystemError', () => {
  it('returns TurbokitError unchanged', () => {
    const original = new DirectoryExistsError('/path');
    const wrapped = wrapFileSystemError(original, '/other', 'read');
    expect(wrapped).toBe(original);
  });

  it('wraps ENOENT error', () => {
    const nodeError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    const wrapped = wrapFileSystemError(nodeError, '/missing/file', 'read');
    expect(wrapped.message).toContain('not found');
  });

  it('wraps EACCES error', () => {
    const nodeError = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    const wrapped = wrapFileSystemError(nodeError, '/protected', 'write');
    expect(wrapped).toBeInstanceOf(PermissionDeniedError);
  });

  it('wraps EEXIST error', () => {
    const nodeError = Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
    const wrapped = wrapFileSystemError(nodeError, '/existing', 'create');
    expect(wrapped).toBeInstanceOf(DirectoryExistsError);
  });

  it('wraps unknown errors', () => {
    const wrapped = wrapFileSystemError('unknown', '/path', 'read');
    expect(wrapped).toBeInstanceOf(FileSystemError);
  });
});

describe('wrapCommandError', () => {
  it('wraps git not found', () => {
    const wrapped = wrapCommandError('git status', 127, 'command not found');
    expect(wrapped).toBeInstanceOf(GitNotInstalledError);
  });

  it('wraps git operation errors', () => {
    const wrapped = wrapCommandError('git commit', 1, 'nothing to commit');
    expect(wrapped).toBeInstanceOf(GitOperationError);
  });

  it('wraps bun not found', () => {
    const wrapped = wrapCommandError('bun --version', 127, 'command not found');
    expect(wrapped).toBeInstanceOf(BunNotInstalledError);
  });

  it('wraps bun install errors', () => {
    const wrapped = wrapCommandError('bun install', 1, 'ENOTFOUND');
    expect(wrapped).toBeInstanceOf(DependencyInstallError);
  });

  it('wraps generic command errors', () => {
    const wrapped = wrapCommandError('unknown-cmd', 1, 'failed');
    expect(wrapped).toBeInstanceOf(CommandFailedError);
  });
});

describe('error.format()', () => {
  it('includes message without verbose', () => {
    const error = new InvalidProjectNameError('Bad Name');
    const formatted = error.format(false);
    expect(formatted).toContain('Invalid project name');
    expect(formatted).not.toContain('Stack trace');
  });

  it('includes stack trace with verbose', () => {
    const error = new InvalidProjectNameError('Bad Name');
    const formatted = error.format(true);
    expect(formatted).toContain('Invalid project name');
    expect(formatted).toContain('Stack trace');
  });

  it('includes suggestion if present', () => {
    const error = new DirectoryExistsError('/path');
    const formatted = error.format(false);
    expect(formatted).toContain('--force');
  });
});
