/**
 * Unit tests for template variable replacement engine
 */

import { describe, it, expect } from 'bun:test';
import { applyVariables, buildVariables } from '../../src/generator/applyVariables';
import type { TemplateVariables, ProjectConfig } from '../../src/types/config';

// Create a test variables object
function createTestVariables(overrides: Partial<TemplateVariables> = {}): TemplateVariables {
  return {
    projectName: 'my-test-project',
    scope: 'my-test-project',
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
    ...overrides,
  };
}

describe('applyVariables', () => {
  describe('basic replacement', () => {
    it('replaces single variable', () => {
      const result = applyVariables('Hello {{projectName}}!', createTestVariables());
      expect(result).toBe('Hello my-test-project!');
    });

    it('replaces multiple different variables', () => {
      const result = applyVariables(
        '{{projectName}} by @{{scope}} in {{year}}',
        createTestVariables()
      );
      expect(result).toBe('my-test-project by @my-test-project in 2024');
    });

    it('replaces same variable multiple times', () => {
      const result = applyVariables(
        '{{projectName}} - {{projectName}} - {{projectName}}',
        createTestVariables()
      );
      expect(result).toBe('my-test-project - my-test-project - my-test-project');
    });
  });

  describe('package.json template', () => {
    it('replaces variables in JSON content', () => {
      const template = `{
  "name": "@{{scope}}/config",
  "version": "0.0.0",
  "dependencies": {
    "react": "{{reactVersion}}",
    "typescript": "{{typescriptVersion}}"
  }
}`;
      const result = applyVariables(template, createTestVariables());
      expect(result).toContain('"name": "@my-test-project/config"');
      expect(result).toContain('"react": "^18.2.0"');
      expect(result).toContain('"typescript": "^5.3.0"');
      // Verify it's valid JSON
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('version variables', () => {
    it('replaces all version variables', () => {
      const variables = createTestVariables();
      const versionTests = [
        { template: '{{reactVersion}}', expected: variables.reactVersion },
        { template: '{{typescriptVersion}}', expected: variables.typescriptVersion },
        { template: '{{viteVersion}}', expected: variables.viteVersion },
        { template: '{{expoVersion}}', expected: variables.expoVersion },
        { template: '{{honoVersion}}', expected: variables.honoVersion },
        { template: '{{storybookVersion}}', expected: variables.storybookVersion },
        { template: '{{vitestVersion}}', expected: variables.vitestVersion },
        { template: '{{turboVersion}}', expected: variables.turboVersion },
        { template: '{{eslintVersion}}', expected: variables.eslintVersion },
        { template: '{{prettierVersion}}', expected: variables.prettierVersion },
        { template: '{{huskyVersion}}', expected: variables.huskyVersion },
      ];

      for (const { template, expected } of versionTests) {
        const result = applyVariables(template, variables);
        expect(result).toBe(expected);
      }
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty content', () => {
      const result = applyVariables('', createTestVariables());
      expect(result).toBe('');
    });

    it('returns content unchanged when no variables present', () => {
      const content = 'No variables here at all.';
      const result = applyVariables(content, createTestVariables());
      expect(result).toBe(content);
    });

    it('preserves whitespace and formatting', () => {
      const template = `  {{projectName}}
    {{scope}}
`;
      const result = applyVariables(template, createTestVariables());
      expect(result).toBe(`  my-test-project
    my-test-project
`);
    });

    it('handles variables adjacent to special characters', () => {
      const result = applyVariables(
        '@{{scope}}/package ({{year}})',
        createTestVariables()
      );
      expect(result).toBe('@my-test-project/package (2024)');
    });

    it('does not replace partial matches', () => {
      const content = '{projectName} or {{ projectName }} or {{projectName ';
      const result = applyVariables(content, createTestVariables());
      expect(result).toBe(content); // Should remain unchanged
    });
  });

  describe('error handling', () => {
    it('throws error for undefined variable', () => {
      expect(() => {
        applyVariables('{{undefinedVar}}', createTestVariables());
      }).toThrow('Undefined template variable: {{undefinedVar}}');
    });

    it('includes available variables in error message', () => {
      try {
        applyVariables('{{unknownVar}}', createTestVariables());
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('projectName');
        expect((error as Error).message).toContain('scope');
      }
    });
  });
});

describe('buildVariables', () => {
  it('builds variables from project config', () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      projectPath: '/path/to/test-app',
      scope: 'test-app',
      modules: {
        web: true,
        mobile: false,
        api: true,
        storybook: false,
        ui: true,
      },
    };

    const variables = buildVariables(config);

    expect(variables.projectName).toBe('test-app');
    expect(variables.scope).toBe('test-app');
    expect(variables.year).toBe(new Date().getFullYear().toString());
  });

  it('includes all version variables', () => {
    const config: ProjectConfig = {
      projectName: 'test',
      projectPath: '/test',
      scope: 'test',
      modules: { web: true, mobile: false, api: false, storybook: false, ui: false },
    };

    const variables = buildVariables(config);

    expect(variables.reactVersion).toBeDefined();
    expect(variables.typescriptVersion).toBeDefined();
    expect(variables.viteVersion).toBeDefined();
    expect(variables.expoVersion).toBeDefined();
    expect(variables.honoVersion).toBeDefined();
    expect(variables.storybookVersion).toBeDefined();
    expect(variables.vitestVersion).toBeDefined();
    expect(variables.turboVersion).toBeDefined();
    expect(variables.eslintVersion).toBeDefined();
    expect(variables.prettierVersion).toBeDefined();
    expect(variables.huskyVersion).toBeDefined();
  });

  it('uses current year', () => {
    const config: ProjectConfig = {
      projectName: 'test',
      projectPath: '/test',
      scope: 'test',
      modules: { web: true, mobile: false, api: false, storybook: false, ui: false },
    };

    const variables = buildVariables(config);
    const currentYear = new Date().getFullYear().toString();

    expect(variables.year).toBe(currentYear);
  });
});
