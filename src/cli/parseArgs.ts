/**
 * CLI argument parser
 */

import type { CLIFlags } from '../types/config';
import { readFile } from '../utils/fs';
import { getPackageRoot } from '../utils/paths';
import { join } from 'node:path';

const HELP_TEXT = `
turbokit - Generate Turborepo-based monorepo projects

USAGE
  turbokit [options]

OPTIONS
  --name <string>     Project name (kebab-case)
  --path <path>       Target directory (default: ./<name>)
  
  --web               Include web app (React + Vite)
  --mobile            Include mobile app (Expo)
  --api               Include API server (Bun + Hono)
  --storybook         Include Storybook app
  --ui                Include shared UI package
  
  -y, --yes           Skip prompts, use defaults
  --dry-run           Print file tree without writing
  -v, --verbose       Show detailed output
  -f, --force         Overwrite existing directory
  
  -h, --help          Show this help message
  --version           Show version number

EXAMPLES
  # Interactive mode
  turbokit

  # Generate with all modules
  turbokit --name my-app --web --api --ui --yes

  # Minimal setup
  turbokit --name my-app --web --yes

  # Preview without creating files
  turbokit --name my-app --web --api --dry-run
`;

/**
 * Parse CLI arguments into CLIFlags
 */
export async function parseArgs(argv: string[]): Promise<CLIFlags> {
  const flags: CLIFlags = {
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
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '--name':
        flags.name = argv[++i];
        break;

      case '--path':
        flags.path = argv[++i];
        break;

      case '--web':
        flags.web = true;
        break;

      case '--mobile':
        flags.mobile = true;
        break;

      case '--api':
        flags.api = true;
        break;

      case '--storybook':
        flags.storybook = true;
        break;

      case '--ui':
        flags.ui = true;
        break;

      case '--yes':
      case '-y':
        flags.yes = true;
        break;

      case '--dry-run':
        flags.dryRun = true;
        break;

      case '--verbose':
      case '-v':
        flags.verbose = true;
        break;

      case '--force':
      case '-f':
        flags.force = true;
        break;

      case '--help':
      case '-h':
        console.log(HELP_TEXT);
        process.exit(0);

      case '--version':
        await printVersion();
        process.exit(0);

      default:
        if (arg.startsWith('-')) {
          console.error(`Error: Unknown flag: ${arg}`);
          console.error('Run "turbokit --help" for usage information.');
          process.exit(1);
        }
        // Ignore positional arguments for now
        break;
    }

    i++;
  }

  return flags;
}

/**
 * Print the CLI version
 */
async function printVersion(): Promise<void> {
  try {
    const packageJsonPath = join(getPackageRoot(), 'package.json');
    const content = await readFile(packageJsonPath);
    const pkg = JSON.parse(content);
    console.log(`turbokit v${pkg.version}`);
  } catch {
    console.log('turbokit (version unknown)');
  }
}
