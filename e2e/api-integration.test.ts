import { $ } from 'bun';
import { rm, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

const TEST_DIR = '/tmp/turbokit-e2e-api-integration';
const TURBOKIT_DIR = '/Users/erikjohansson/dev/turbokit';

describe('E2E: API Integration', () => {
  beforeAll(async () => {
    // Clean up any previous test and create fresh directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    // Create the parent directory so the CLI validation passes
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up after test
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe('Project with API selected (web + api + ui)', () => {
    const PROJECT_DIR = `${TEST_DIR}/with-api`;

    it('generates API integration files when API module selected', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name with-api-test \
        --path ${PROJECT_DIR} \
        --web --api --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // API app files
      expect(existsSync(`${PROJECT_DIR}/apps/api/wrangler.toml`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/api/src/index.ts`)).toBe(true);

      // api-client package
      expect(existsSync(`${PROJECT_DIR}/packages/api-client`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client/src/client.ts`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client/src/hooks.ts`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client/src/index.ts`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client/package.json`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client/tsconfig.json`)).toBe(true);

      // Web app API integration
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/api/index.ts`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/providers/QueryProvider.tsx`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/web/.env.example`)).toBe(true);
    });

    it('web App.tsx contains API integration code (useHealth)', async () => {
      const appContent = readFileSync(`${PROJECT_DIR}/apps/web/src/App.tsx`, 'utf-8');
      expect(appContent).toContain('useHealth');
      expect(appContent).toContain('./api');
    });

    it('api-client hooks.ts exports createApiHooks', async () => {
      const hooksContent = readFileSync(
        `${PROJECT_DIR}/packages/api-client/src/hooks.ts`,
        'utf-8'
      );
      expect(hooksContent).toContain('createApiHooks');
      expect(hooksContent).toContain('useHealth');
    });

    it('api-client package.json has correct dependencies', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/packages/api-client/package.json`, 'utf-8')
      );
      expect(packageJson.name).toBe('@with-api-test/api-client');
      expect(packageJson.dependencies).toHaveProperty('@with-api-test/api');
      expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query');
      expect(packageJson.dependencies).toHaveProperty('hono');
    });

    it('web package.json includes api-client dependency', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/apps/web/package.json`, 'utf-8')
      );
      expect(packageJson.dependencies).toHaveProperty('@with-api-test/api-client');
      expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query');
      expect(packageJson.devDependencies).toHaveProperty('@tanstack/react-query-devtools');
    });

    it('API exports AppType for RPC client', async () => {
      const apiIndexContent = readFileSync(
        `${PROJECT_DIR}/apps/api/src/index.ts`,
        'utf-8'
      );
      expect(apiIndexContent).toContain('export type AppType');
    });

    it('variant files (.with-api.) are NOT copied directly', async () => {
      // Variant source files should never appear in output
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/App.with-api.tsx`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/web/package.with-api.json`)).toBe(false);

      // Regular file SHOULD exist
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/App.tsx`)).toBe(true);
    });

    it('generated project installs dependencies', async () => {
      const result = await $`bun install`.cwd(PROJECT_DIR).quiet();
      expect(result.exitCode).toBe(0);
      expect(existsSync(`${PROJECT_DIR}/node_modules`)).toBe(true);
    });

    it('generated project passes typecheck (types flow end-to-end)', async () => {
      const result = await $`bun run typecheck`.cwd(PROJECT_DIR).quiet();
      expect(result.exitCode).toBe(0);
    }, 60000); // 60s timeout for typecheck
  });

  describe('Project WITHOUT API selected (web + ui only)', () => {
    const PROJECT_DIR = `${TEST_DIR}/without-api`;

    it('excludes API files when API module not selected', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name no-api-test \
        --path ${PROJECT_DIR} \
        --web --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // These should NOT exist
      expect(existsSync(`${PROJECT_DIR}/apps/api`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/api`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/web/.env.example`)).toBe(false);

      // QueryProvider SHOULD exist (always generated)
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/providers/QueryProvider.tsx`)).toBe(
        true
      );

      // Web app should exist
      expect(existsSync(`${PROJECT_DIR}/apps/web/src/App.tsx`)).toBe(true);
    });

    it('web App.tsx does NOT contain API code', async () => {
      const appContent = readFileSync(`${PROJECT_DIR}/apps/web/src/App.tsx`, 'utf-8');
      expect(appContent).not.toContain('useHealth');
      expect(appContent).not.toContain('./api');
    });

    it('web package.json does NOT include api-client dependency', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/apps/web/package.json`, 'utf-8')
      );
      expect(packageJson.dependencies).not.toHaveProperty('@no-api-test/api-client');
      // Should still have TanStack Query (always included)
      expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query');
    });

    it('generated project without API passes typecheck', async () => {
      const installResult = await $`bun install`.cwd(PROJECT_DIR).quiet();
      expect(installResult.exitCode).toBe(0);

      const typecheckResult = await $`bun run typecheck`.cwd(PROJECT_DIR).quiet();
      expect(typecheckResult.exitCode).toBe(0);
    }, 60000);
  });

  describe('Mobile with API (platform-aware configuration)', () => {
    const PROJECT_DIR = `${TEST_DIR}/mobile-api`;

    it('generates mobile with platform-aware API config', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name mobile-api-test \
        --path ${PROJECT_DIR} \
        --mobile --api \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Mobile app exists
      expect(existsSync(`${PROJECT_DIR}/apps/mobile`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/App.tsx`)).toBe(true);

      // app.config.ts should exist (not app.json for API integration)
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/app.config.ts`)).toBe(true);

      // Platform-aware env.ts should exist
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/config/env.ts`)).toBe(true);

      // Mobile API integration files
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/api/index.ts`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/providers/QueryProvider.tsx`)).toBe(
        true
      );
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/.env.example`)).toBe(true);

      // api-client package should exist
      expect(existsSync(`${PROJECT_DIR}/packages/api-client`)).toBe(true);
    });

    it('env.ts has Android emulator handling (10.0.2.2)', async () => {
      const envContent = readFileSync(
        `${PROJECT_DIR}/apps/mobile/src/config/env.ts`,
        'utf-8'
      );
      expect(envContent).toContain('10.0.2.2');
      expect(envContent).toContain('Platform.OS');
      expect(envContent).toContain('android');
    });

    it('mobile App.tsx contains API integration code', async () => {
      const appContent = readFileSync(`${PROJECT_DIR}/apps/mobile/App.tsx`, 'utf-8');
      expect(appContent).toContain('useHealth');
      expect(appContent).toContain('./src/api');
    });

    it('mobile package.json includes api-client dependency', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/apps/mobile/package.json`, 'utf-8')
      );
      expect(packageJson.dependencies).toHaveProperty('@mobile-api-test/api-client');
      expect(packageJson.dependencies).toHaveProperty('@tanstack/react-query');
      expect(packageJson.dependencies).toHaveProperty('expo-constants');
    });

    it('variant files (.with-api.) are NOT copied to mobile', async () => {
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/App.with-api.tsx`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/package.with-api.json`)).toBe(false);
    });
  });

  describe('Mobile WITHOUT API', () => {
    const PROJECT_DIR = `${TEST_DIR}/mobile-no-api`;

    it('generates mobile without API integration files', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name mobile-no-api-test \
        --path ${PROJECT_DIR} \
        --mobile \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Mobile app exists
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/App.tsx`)).toBe(true);

      // Should NOT have API integration files
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/api`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/config/env.ts`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/.env.example`)).toBe(false);
      expect(existsSync(`${PROJECT_DIR}/packages/api-client`)).toBe(false);

      // QueryProvider SHOULD still exist
      expect(existsSync(`${PROJECT_DIR}/apps/mobile/src/providers/QueryProvider.tsx`)).toBe(
        true
      );
    });

    it('mobile App.tsx does NOT contain API code', async () => {
      const appContent = readFileSync(`${PROJECT_DIR}/apps/mobile/App.tsx`, 'utf-8');
      expect(appContent).not.toContain('useHealth');
      expect(appContent).not.toContain('./src/api');
    });
  });

  describe('Full stack (web + mobile + api + ui)', () => {
    const PROJECT_DIR = `${TEST_DIR}/full-stack`;

    it('generates all apps with shared api-client', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name fullstack-test \
        --path ${PROJECT_DIR} \
        --web --mobile --api --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // All apps exist
      expect(existsSync(`${PROJECT_DIR}/apps/web`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/mobile`)).toBe(true);
      expect(existsSync(`${PROJECT_DIR}/apps/api`)).toBe(true);

      // Shared api-client package exists once
      expect(existsSync(`${PROJECT_DIR}/packages/api-client`)).toBe(true);

      // Both web and mobile use the shared api-client
      const webPackageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/apps/web/package.json`, 'utf-8')
      );
      const mobilePackageJson = JSON.parse(
        readFileSync(`${PROJECT_DIR}/apps/mobile/package.json`, 'utf-8')
      );

      expect(webPackageJson.dependencies).toHaveProperty('@fullstack-test/api-client');
      expect(mobilePackageJson.dependencies).toHaveProperty('@fullstack-test/api-client');
    });

    it('full stack project installs dependencies', async () => {
      const installResult = await $`bun install`.cwd(PROJECT_DIR).quiet();
      expect(installResult.exitCode).toBe(0);
      expect(existsSync(`${PROJECT_DIR}/node_modules`)).toBe(true);
    });

    it('full stack project typechecks', async () => {
      const typecheckResult = await $`bun run typecheck`.cwd(PROJECT_DIR).quiet();
      expect(typecheckResult.exitCode).toBe(0);
    }, 90000);
  });

  describe('README with API integration docs', () => {
    it('README includes API integration section when API selected', async () => {
      const projectDir = `${TEST_DIR}/with-api`;
      // This project was created in the first test suite
      const readmeContent = readFileSync(`${projectDir}/README.md`, 'utf-8');
      expect(readmeContent).toContain('API');
    });
  });
});
