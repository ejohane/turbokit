/**
 * Logger utility with verbose mode support
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Check if output is a TTY (supports colors)
const isTTY = process.stdout.isTTY ?? false;

function colorize(text: string, color: keyof typeof colors): string {
  if (!isTTY) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Logger interface for consistent CLI output
 */
export interface Logger {
  /** Informational message */
  info(message: string): void;
  /** Success message with checkmark */
  success(message: string): void;
  /** Warning message */
  warn(message: string): void;
  /** Error message */
  error(message: string): void;
  /** Debug message (only shows with verbose=true) */
  debug(message: string): void;
  /** Progress step indicator */
  step(current: number, total: number, message: string): void;
  /** Format text as dim */
  dim(message: string): string;
  /** Format text as bold */
  bold(message: string): string;
}

/**
 * Create a logger instance
 * @param verbose - Enable debug output
 */
export function createLogger(verbose: boolean): Logger {
  return {
    info(message: string): void {
      console.log(colorize('i', 'blue'), message);
    },

    success(message: string): void {
      console.log(colorize('✓', 'green'), message);
    },

    warn(message: string): void {
      console.log(colorize('⚠', 'yellow'), message);
    },

    error(message: string): void {
      console.error(colorize('✗', 'red'), message);
    },

    debug(message: string): void {
      if (verbose) {
        console.log(colorize('debug:', 'dim'), message);
      }
    },

    step(current: number, total: number, message: string): void {
      const prefix = colorize(`[${current}/${total}]`, 'cyan');
      console.log(prefix, message);
    },

    dim(message: string): string {
      return colorize(message, 'dim');
    },

    bold(message: string): string {
      return colorize(message, 'bold');
    },
  };
}
