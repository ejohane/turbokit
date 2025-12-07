/**
 * Dry-run mode - displays a tree view of files that would be created
 */

import { dirname, join, relative } from 'node:path';
import type { ProjectConfig } from '../types/config';
import { buildVariables } from '../generator/applyVariables';
import { copyTemplate } from '../generator/copyTemplate';

/** Tree node for building the file tree structure */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

/** Box-drawing characters for tree visualization */
const BRANCH = '├── ';
const LAST_BRANCH = '└── ';
const VERTICAL = '│   ';
const EMPTY = '    ';

/**
 * Get the templates directory path
 */
function getTemplatesDir(): string {
  return join(dirname(dirname(dirname(import.meta.path))), 'templates');
}

/**
 * Collect all file paths that would be created
 */
async function collectFilePaths(config: ProjectConfig): Promise<string[]> {
  const templatesDir = getTemplatesDir();
  const variables = buildVariables(config);
  const allPaths: string[] = [];

  const copyOpts = { variables, dryRun: true };

  // 1. Root templates
  const rootPaths = await copyTemplate(
    join(templatesDir, 'root'),
    config.projectPath,
    copyOpts
  );
  allPaths.push(...rootPaths);

  // 2. Config package (always included)
  const configPaths = await copyTemplate(
    join(templatesDir, 'packages', 'config'),
    join(config.projectPath, 'packages', 'config'),
    copyOpts
  );
  allPaths.push(...configPaths);

  // 3. Selected apps
  const { modules } = config;

  if (modules.web) {
    const webPaths = await copyTemplate(
      join(templatesDir, 'apps', 'web'),
      join(config.projectPath, 'apps', 'web'),
      copyOpts
    );
    allPaths.push(...webPaths);
  }

  if (modules.mobile) {
    const mobilePaths = await copyTemplate(
      join(templatesDir, 'apps', 'mobile'),
      join(config.projectPath, 'apps', 'mobile'),
      copyOpts
    );
    allPaths.push(...mobilePaths);
  }

  if (modules.api) {
    const apiPaths = await copyTemplate(
      join(templatesDir, 'apps', 'api'),
      join(config.projectPath, 'apps', 'api'),
      copyOpts
    );
    allPaths.push(...apiPaths);
  }

  if (modules.storybook) {
    const storybookPaths = await copyTemplate(
      join(templatesDir, 'apps', 'storybook'),
      join(config.projectPath, 'apps', 'storybook'),
      copyOpts
    );
    allPaths.push(...storybookPaths);
  }

  // 4. UI package if selected
  if (modules.ui) {
    const uiPaths = await copyTemplate(
      join(templatesDir, 'packages', 'ui'),
      join(config.projectPath, 'packages', 'ui'),
      copyOpts
    );
    allPaths.push(...uiPaths);
  }

  // 5. Husky hooks
  const huskyPaths = await copyTemplate(
    join(templatesDir, 'husky'),
    join(config.projectPath, '.husky'),
    copyOpts
  );
  allPaths.push(...huskyPaths);

  // 6. CI pipelines
  const pipelinePaths = await copyTemplate(
    join(templatesDir, 'pipelines'),
    join(config.projectPath, '.github', 'workflows'),
    copyOpts
  );
  allPaths.push(...pipelinePaths);

  return allPaths;
}

/**
 * Build a tree structure from flat file paths
 */
function buildTree(paths: string[], rootPath: string): TreeNode {
  const root: TreeNode = {
    name: rootPath.split('/').pop() || rootPath,
    children: new Map(),
    isFile: false,
  };

  for (const fullPath of paths) {
    // Get path relative to the project root
    const relativePath = relative(rootPath, fullPath);
    const parts = relativePath.split('/');

    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          children: new Map(),
          isFile: isLast,
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

/**
 * Recursively print the tree with box-drawing characters
 */
function printTreeNode(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
  output: string[]
): void {
  if (isRoot) {
    output.push(`${node.name}/`);
  } else {
    const branch = isLast ? LAST_BRANCH : BRANCH;
    const suffix = node.isFile ? '' : '/';
    output.push(`${prefix}${branch}${node.name}${suffix}`);
  }

  // Sort children: directories first, then files, both alphabetically
  const children = Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1; // Directories first
    }
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childIsLast = i === children.length - 1;
    const newPrefix = isRoot ? '' : prefix + (isLast ? EMPTY : VERTICAL);

    printTreeNode(child, newPrefix, childIsLast, false, output);
  }
}

/**
 * Display dry-run tree of files that would be created
 */
export async function printDryRun(config: ProjectConfig): Promise<void> {
  console.log('\nDry run - files that would be created:\n');

  // Collect all file paths
  const paths = await collectFilePaths(config);

  // Build tree structure
  const tree = buildTree(paths, config.projectPath);

  // Print tree
  const output: string[] = [];
  printTreeNode(tree, '', true, true, output);
  console.log(output.join('\n'));

  // Print summary
  console.log(`\nTotal: ${paths.length} files`);
}
