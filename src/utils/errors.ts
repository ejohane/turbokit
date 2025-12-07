/**
 * Custom error types for user-friendly CLI error handling
 */

/**
 * Base class for all turbokit CLI errors
 * Provides structured error information with suggestions for resolution
 */
export abstract class TurbokitError extends Error {
  /** Error category for programmatic handling */
  abstract readonly category: ErrorCategory;
  /** Suggested action to resolve the error */
  abstract readonly suggestion?: string;
  /** Exit code to use when this error causes program termination */
  readonly exitCode: number = 1;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Format error for display to user
   * @param verbose - Include stack trace
   */
  format(verbose: boolean = false): string {
    let output = `Error: ${this.message}`;
    if (this.suggestion) {
      output += `\n\n  → ${this.suggestion}`;
    }
    if (verbose && this.stack) {
      output += `\n\nStack trace:\n${this.stack}`;
    }
    return output;
  }
}

export type ErrorCategory =
  | 'filesystem'
  | 'validation'
  | 'git'
  | 'network'
  | 'command'
  | 'cancelled';

// ============================================================================
// File System Errors
// ============================================================================

/**
 * Error when a directory already exists and --force wasn't used
 */
export class DirectoryExistsError extends TurbokitError {
  readonly category = 'filesystem' as const;
  readonly suggestion = 'Use --force to overwrite the existing directory, or choose a different path';

  constructor(public readonly path: string) {
    super(`Directory already exists: ${path}`);
  }
}

/**
 * Error when parent directory doesn't exist
 */
export class ParentDirectoryNotFoundError extends TurbokitError {
  readonly category = 'filesystem' as const;
  readonly suggestion: string;

  constructor(public readonly path: string, public readonly parentPath: string) {
    super(`Parent directory does not exist: ${parentPath}`);
    this.suggestion = `Create the parent directory first:\n     mkdir -p ${parentPath}`;
  }
}

/**
 * Error when file/directory operations fail due to permissions
 */
export class PermissionDeniedError extends TurbokitError {
  readonly category = 'filesystem' as const;
  readonly suggestion: string;

  constructor(public readonly path: string, public readonly operation: string) {
    super(`Permission denied: cannot ${operation} ${path}`);
    this.suggestion = `Check file permissions or try running with appropriate privileges`;
  }
}

/**
 * Error when a template file is missing
 */
export class TemplateNotFoundError extends TurbokitError {
  readonly category = 'filesystem' as const;
  readonly suggestion = 'This may indicate a corrupted installation. Try reinstalling turbokit.';

  constructor(public readonly templatePath: string) {
    super(`Template not found: ${templatePath}`);
  }
}

/**
 * Generic file system error wrapper
 */
export class FileSystemError extends TurbokitError {
  readonly category = 'filesystem' as const;
  readonly suggestion?: string;

  constructor(message: string, suggestion?: string) {
    super(message);
    this.suggestion = suggestion;
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Error for invalid project name
 */
export class InvalidProjectNameError extends TurbokitError {
  readonly category = 'validation' as const;
  readonly suggestion = 'Use lowercase letters, numbers, and hyphens only (kebab-case).\n     Examples: my-app, cool-project-2';

  constructor(public readonly invalidName: string) {
    super(`Invalid project name: "${invalidName}"`);
  }
}

/**
 * Error when no modules are selected
 */
export class NoModulesSelectedError extends TurbokitError {
  readonly category = 'validation' as const;
  readonly suggestion = 'Select at least one app module: --web, --mobile, --api, or --storybook';

  constructor() {
    super('At least one app module must be selected');
  }
}

/**
 * Generic validation error
 */
export class ValidationFailedError extends TurbokitError {
  readonly category = 'validation' as const;
  readonly suggestion?: string;

  constructor(message: string, suggestion?: string) {
    super(message);
    this.suggestion = suggestion;
  }
}

// ============================================================================
// Git Errors
// ============================================================================

/**
 * Error when git is not installed
 */
export class GitNotInstalledError extends TurbokitError {
  readonly category = 'git' as const;
  readonly suggestion: string;

  constructor() {
    super('Git is not installed or not found in PATH');
    const platform = process.platform;
    if (platform === 'darwin') {
      this.suggestion = 'Install git using Homebrew:\n     brew install git';
    } else if (platform === 'linux') {
      this.suggestion = 'Install git using your package manager:\n     apt install git   # Debian/Ubuntu\n     dnf install git   # Fedora';
    } else if (platform === 'win32') {
      this.suggestion = 'Download and install git from:\n     https://git-scm.com/download/win';
    } else {
      this.suggestion = 'Install git from https://git-scm.com/downloads';
    }
  }
}

/**
 * Error when a git operation fails
 */
export class GitOperationError extends TurbokitError {
  readonly category = 'git' as const;
  readonly suggestion?: string;

  constructor(
    public readonly operation: string,
    public readonly stderr: string
  ) {
    super(`Git ${operation} failed: ${stderr.trim() || 'Unknown error'}`);
    // Common git error suggestions
    if (stderr.includes('not a git repository')) {
      this.suggestion = 'Initialize a git repository first with: git init';
    } else if (stderr.includes('Permission denied')) {
      this.suggestion = 'Check your SSH keys or repository permissions';
    }
  }
}

// ============================================================================
// Network/Command Errors
// ============================================================================

/**
 * Error when bun is not installed
 */
export class BunNotInstalledError extends TurbokitError {
  readonly category = 'command' as const;
  readonly suggestion = 'Install Bun from https://bun.sh:\n     curl -fsSL https://bun.sh/install | bash';

  constructor() {
    super('Bun is not installed or not found in PATH');
  }
}

/**
 * Error when dependency installation fails
 */
export class DependencyInstallError extends TurbokitError {
  readonly category = 'network' as const;
  readonly suggestion: string;

  constructor(public readonly stderr: string) {
    super('Failed to install dependencies');
    if (stderr.includes('ENOTFOUND') || stderr.includes('network')) {
      this.suggestion = 'Check your internet connection and try again';
    } else if (stderr.includes('EACCES') || stderr.includes('permission')) {
      this.suggestion = 'Check folder permissions or try running without sudo';
    } else {
      this.suggestion = `Try running 'bun install' manually in the project directory.\n     Error details: ${stderr.slice(0, 200)}`;
    }
  }
}

/**
 * Error when an external command fails
 */
export class CommandFailedError extends TurbokitError {
  readonly category = 'command' as const;
  readonly suggestion?: string;

  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(`Command failed: ${command}`);
    if (stderr) {
      this.suggestion = stderr.slice(0, 300);
    }
  }
}

// ============================================================================
// User Action Errors
// ============================================================================

/**
 * Error when user cancels an operation
 */
export class OperationCancelledError extends TurbokitError {
  readonly category = 'cancelled' as const;
  readonly suggestion = undefined;
  readonly exitCode = 0; // Not an error, just user cancellation

  constructor(message: string = 'Operation cancelled by user') {
    super(message);
  }
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Check if an error is a TurbokitError
 */
export function isTurbokitError(error: unknown): error is TurbokitError {
  return error instanceof TurbokitError;
}

/**
 * Wrap a file system error with appropriate TurbokitError type
 */
export function wrapFileSystemError(
  error: unknown,
  path: string,
  operation: string
): TurbokitError {
  if (error instanceof TurbokitError) {
    return error;
  }

  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    
    switch (code) {
      case 'ENOENT':
        return new FileSystemError(
          `File or directory not found: ${path}`,
          'Check that the path exists and is spelled correctly'
        );
      case 'EACCES':
      case 'EPERM':
        return new PermissionDeniedError(path, operation);
      case 'EEXIST':
        return new DirectoryExistsError(path);
      case 'ENOSPC':
        return new FileSystemError(
          `No space left on device while ${operation}: ${path}`,
          'Free up disk space and try again'
        );
      case 'EMFILE':
      case 'ENFILE':
        return new FileSystemError(
          `Too many open files while ${operation}: ${path}`,
          'Close some applications or increase system file limits'
        );
      default:
        return new FileSystemError(
          `Failed to ${operation} ${path}: ${error.message}`
        );
    }
  }

  return new FileSystemError(`Unknown error during ${operation}: ${path}`);
}

/**
 * Wrap a command execution error
 */
export function wrapCommandError(
  command: string,
  exitCode: number,
  stderr: string
): TurbokitError {
  // Check for specific command failures
  if (command.startsWith('git')) {
    if (stderr.includes('command not found') || stderr.includes('not recognized')) {
      return new GitNotInstalledError();
    }
    const operation = command.split(' ')[1] || 'operation';
    return new GitOperationError(operation, stderr);
  }

  if (command.startsWith('bun')) {
    if (stderr.includes('command not found') || stderr.includes('not recognized')) {
      return new BunNotInstalledError();
    }
    if (command.includes('install')) {
      return new DependencyInstallError(stderr);
    }
  }

  return new CommandFailedError(command, exitCode, stderr);
}
