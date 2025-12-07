/**
 * Interactive prompts for project configuration
 */

import { input, checkbox, confirm } from '@inquirer/prompts';
import type { CLIFlags, ProjectConfig, ModuleSelection } from '../types/config';
import { isValidPackageName, toValidDirName, toScope, resolveFromCwd } from '../utils/paths';
import { DEFAULT_MODULES } from '../config/defaults';
import { basename } from 'node:path';

interface ModuleChoice {
  name: string;
  value: keyof ModuleSelection;
  checked: boolean;
}

/**
 * Prompt for project configuration when flags are not provided
 */
export async function promptForConfig(flags: CLIFlags): Promise<ProjectConfig> {
  // If --yes is set, use defaults without prompting
  if (flags.yes) {
    return buildConfigFromFlags(flags);
  }

  // 1. Prompt for project name if not provided
  let projectName = flags.name;
  if (!projectName) {
    const cwd = process.cwd();
    const currentDirName = toValidDirName(basename(cwd));
    
    projectName = await input({
      message: 'Project name (kebab-case):',
      default: currentDirName || 'my-project',
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return 'Project name is required';
        }
        if (!isValidPackageName(trimmed)) {
          return 'Invalid package name. Use lowercase letters, numbers, and hyphens only.';
        }
        return true;
      },
      transformer: (value: string) => toValidDirName(value),
    });
  }

  // 2. Prompt for project path if not provided
  let projectPath = flags.path;
  if (!projectPath) {
    projectPath = await input({
      message: 'Project directory:',
      default: `./${projectName}`,
    });
  }

  // 3. Prompt for module selection if no module flags are set
  let modules: ModuleSelection;
  const hasModuleFlags = flags.web || flags.mobile || flags.api || flags.storybook || flags.ui;
  
  if (hasModuleFlags) {
    // Use flags for module selection
    modules = {
      web: flags.web,
      mobile: flags.mobile,
      api: flags.api,
      storybook: flags.storybook,
      ui: flags.ui,
    };
  } else {
    // Prompt for modules with multi-select
    const choices: ModuleChoice[] = [
      { name: 'Web app (React + Vite)', value: 'web', checked: DEFAULT_MODULES.web },
      { name: 'Mobile app (Expo)', value: 'mobile', checked: DEFAULT_MODULES.mobile },
      { name: 'API server (Bun + Hono)', value: 'api', checked: DEFAULT_MODULES.api },
      { name: 'Storybook app', value: 'storybook', checked: DEFAULT_MODULES.storybook },
      { name: 'UI package (shared components)', value: 'ui', checked: DEFAULT_MODULES.ui },
    ];

    const selectedModules = await checkbox({
      message: 'Select modules to include:',
      choices,
      validate: (selections) => {
        if (selections.length === 0) {
          return 'At least one module must be selected';
        }
        return true;
      },
    });

    modules = {
      web: selectedModules.includes('web'),
      mobile: selectedModules.includes('mobile'),
      api: selectedModules.includes('api'),
      storybook: selectedModules.includes('storybook'),
      ui: selectedModules.includes('ui'),
    };
  }

  // 4. Show summary and confirm
  const config: ProjectConfig = {
    projectName,
    projectPath: resolveFromCwd(projectPath),
    scope: toScope(projectName),
    modules,
  };

  console.log('\nProject Configuration:');
  console.log(`  Name:      ${config.projectName}`);
  console.log(`  Path:      ${config.projectPath}`);
  console.log(`  Scope:     @${config.scope}`);
  console.log(`\nModules:`);
  if (modules.web) console.log('  ✓ Web app (React + Vite)');
  if (modules.mobile) console.log('  ✓ Mobile app (Expo)');
  if (modules.api) console.log('  ✓ API server (Bun + Hono)');
  if (modules.storybook) console.log('  ✓ Storybook app');
  if (modules.ui) console.log('  ✓ UI package');
  console.log('');

  const proceed = await confirm({
    message: 'Proceed with project generation?',
    default: true,
  });

  if (!proceed) {
    console.log('Project generation cancelled.');
    process.exit(0);
  }

  return config;
}

/**
 * Build config from flags without prompting (for --yes mode)
 */
function buildConfigFromFlags(flags: CLIFlags): ProjectConfig {
  // Use provided name or fallback to 'my-project'
  const projectName = flags.name || 'my-project';
  
  // Use provided path or default to ./<name>
  const projectPath = flags.path 
    ? resolveFromCwd(flags.path)
    : resolveFromCwd(`./${projectName}`);

  // Determine modules: use flags if any are set, otherwise use defaults
  const hasModuleFlags = flags.web || flags.mobile || flags.api || flags.storybook || flags.ui;
  const modules: ModuleSelection = hasModuleFlags
    ? {
        web: flags.web,
        mobile: flags.mobile,
        api: flags.api,
        storybook: flags.storybook,
        ui: flags.ui,
      }
    : DEFAULT_MODULES;

  return {
    projectName,
    projectPath,
    scope: toScope(projectName),
    modules,
  };
}
