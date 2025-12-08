import { $ } from 'bun';
import { rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

const TEST_DIR = '/tmp/turbokit-e2e-test';
const TURBOKIT_DIR = '/Users/erikjohansson/dev/turbokit';

describe('E2E: Project Generation', () => {
  beforeAll(async () => {
    // Clean up any previous test
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up after test
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe('Full project generation (web + api + ui)', () => {
    it('generates a complete project with all modules', async () => {
      // Generate project
      const result = await $`bun run bin/turbokit.ts \
        --name e2e-test \
        --path ${TEST_DIR} \
        --web --api --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Verify root structure
      expect(existsSync(`${TEST_DIR}/package.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/tsconfig.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/turbo.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/README.md`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/AGENTS.md`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/.gitignore`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/.editorconfig`)).toBe(true);

      // Verify apps structure
      expect(existsSync(`${TEST_DIR}/apps/web`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/apps/web/package.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/apps/web/src/App.tsx`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/apps/api`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/apps/api/package.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/apps/api/src/index.ts`)).toBe(true);

      // Verify packages structure
      expect(existsSync(`${TEST_DIR}/packages/config`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/packages/config/package.json`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/packages/ui`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/packages/ui/package.json`)).toBe(true);

      // Verify husky and CI
      expect(existsSync(`${TEST_DIR}/.husky/pre-commit`)).toBe(true);
      expect(existsSync(`${TEST_DIR}/.github/workflows/ci.yml`)).toBe(true);

      // Verify git was initialized
      expect(existsSync(`${TEST_DIR}/.git`)).toBe(true);
    });

    it('generated package.json contains correct project name', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${TEST_DIR}/package.json`, 'utf-8')
      );
      expect(packageJson.name).toBe('e2e-test');
    });

    it('generated project has correct workspace configuration', async () => {
      const packageJson = JSON.parse(
        readFileSync(`${TEST_DIR}/package.json`, 'utf-8')
      );
      expect(packageJson.workspaces).toContain('apps/*');
      expect(packageJson.workspaces).toContain('packages/*');
    });

    it('generated project installs dependencies', async () => {
      const result = await $`bun install`.cwd(TEST_DIR).quiet();
      expect(result.exitCode).toBe(0);
      expect(existsSync(`${TEST_DIR}/node_modules`)).toBe(true);
    });

    it('generated project passes typecheck', async () => {
      const result = await $`bun run typecheck`.cwd(TEST_DIR).quiet();
      expect(result.exitCode).toBe(0);
    }, 60000); // 60s timeout for typecheck
  });

  describe('Minimal project generation (web only)', () => {
    const MINIMAL_DIR = '/tmp/turbokit-e2e-minimal';

    beforeAll(async () => {
      if (existsSync(MINIMAL_DIR)) {
        await rm(MINIMAL_DIR, { recursive: true });
      }
    });

    afterAll(async () => {
      if (existsSync(MINIMAL_DIR)) {
        await rm(MINIMAL_DIR, { recursive: true });
      }
    });

    it('generates minimal project with only web app', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name minimal-test \
        --path ${MINIMAL_DIR} \
        --web \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Verify web app exists
      expect(existsSync(`${MINIMAL_DIR}/apps/web`)).toBe(true);

      // Verify other apps don't exist
      expect(existsSync(`${MINIMAL_DIR}/apps/api`)).toBe(false);
      expect(existsSync(`${MINIMAL_DIR}/apps/mobile`)).toBe(false);
      expect(existsSync(`${MINIMAL_DIR}/apps/storybook`)).toBe(false);

      // UI package should not exist
      expect(existsSync(`${MINIMAL_DIR}/packages/ui`)).toBe(false);

      // Config package should always exist
      expect(existsSync(`${MINIMAL_DIR}/packages/config`)).toBe(true);
    });
  });

  describe('API + UI only generation', () => {
    const API_UI_DIR = '/tmp/turbokit-e2e-api-ui';

    beforeAll(async () => {
      if (existsSync(API_UI_DIR)) {
        await rm(API_UI_DIR, { recursive: true });
      }
    });

    afterAll(async () => {
      if (existsSync(API_UI_DIR)) {
        await rm(API_UI_DIR, { recursive: true });
      }
    });

    it('generates project with api and ui only', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name api-ui-test \
        --path ${API_UI_DIR} \
        --api --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Verify api exists
      expect(existsSync(`${API_UI_DIR}/apps/api`)).toBe(true);
      expect(existsSync(`${API_UI_DIR}/apps/api/src/index.ts`)).toBe(true);

      // Verify ui package exists
      expect(existsSync(`${API_UI_DIR}/packages/ui`)).toBe(true);

      // Verify web doesn't exist
      expect(existsSync(`${API_UI_DIR}/apps/web`)).toBe(false);
    });
  });

  describe('Dry-run mode', () => {
    it('dry-run does not create files', async () => {
      const DRY_RUN_DIR = '/tmp/turbokit-e2e-dry-run';

      // Clean up first
      if (existsSync(DRY_RUN_DIR)) {
        await rm(DRY_RUN_DIR, { recursive: true });
      }

      const result = await $`bun run bin/turbokit.ts \
        --name dry-run-test \
        --path ${DRY_RUN_DIR} \
        --web --api \
        --dry-run \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Directory should NOT exist
      expect(existsSync(DRY_RUN_DIR)).toBe(false);
    });
  });

  describe('Mobile app generation', () => {
    const MOBILE_DIR = '/tmp/turbokit-e2e-mobile';

    beforeAll(async () => {
      if (existsSync(MOBILE_DIR)) {
        await rm(MOBILE_DIR, { recursive: true });
      }
    });

    afterAll(async () => {
      if (existsSync(MOBILE_DIR)) {
        await rm(MOBILE_DIR, { recursive: true });
      }
    });

    it('generates project with mobile app', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name mobile-test \
        --path ${MOBILE_DIR} \
        --mobile \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Verify mobile app exists
      expect(existsSync(`${MOBILE_DIR}/apps/mobile`)).toBe(true);
      expect(existsSync(`${MOBILE_DIR}/apps/mobile/package.json`)).toBe(true);
      expect(existsSync(`${MOBILE_DIR}/apps/mobile/App.tsx`)).toBe(true);
      expect(existsSync(`${MOBILE_DIR}/apps/mobile/app.config.ts`)).toBe(true);
    });
  });

  describe('Storybook generation', () => {
    const STORYBOOK_DIR = '/tmp/turbokit-e2e-storybook';

    beforeAll(async () => {
      if (existsSync(STORYBOOK_DIR)) {
        await rm(STORYBOOK_DIR, { recursive: true });
      }
    });

    afterAll(async () => {
      if (existsSync(STORYBOOK_DIR)) {
        await rm(STORYBOOK_DIR, { recursive: true });
      }
    });

    it('generates project with storybook', async () => {
      const result = await $`bun run bin/turbokit.ts \
        --name storybook-test \
        --path ${STORYBOOK_DIR} \
        --storybook --ui \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Verify storybook exists
      expect(existsSync(`${STORYBOOK_DIR}/apps/storybook`)).toBe(true);
      expect(existsSync(`${STORYBOOK_DIR}/apps/storybook/package.json`)).toBe(
        true
      );
      expect(
        existsSync(`${STORYBOOK_DIR}/apps/storybook/.storybook/main.ts`)
      ).toBe(true);
      expect(
        existsSync(`${STORYBOOK_DIR}/apps/storybook/.storybook/preview.ts`)
      ).toBe(true);
    });
  });

  describe('Force overwrite', () => {
    const FORCE_DIR = '/tmp/turbokit-e2e-force';

    beforeAll(async () => {
      if (existsSync(FORCE_DIR)) {
        await rm(FORCE_DIR, { recursive: true });
      }
    });

    afterAll(async () => {
      if (existsSync(FORCE_DIR)) {
        await rm(FORCE_DIR, { recursive: true });
      }
    });

    it('overwrites existing directory with --force', async () => {
      // First generation
      await $`bun run bin/turbokit.ts \
        --name force-test \
        --path ${FORCE_DIR} \
        --web \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(existsSync(FORCE_DIR)).toBe(true);

      // Second generation with --force should succeed
      const result = await $`bun run bin/turbokit.ts \
        --name force-test \
        --path ${FORCE_DIR} \
        --web --api \
        --force \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      expect(result.exitCode).toBe(0);

      // Should have api now
      expect(existsSync(`${FORCE_DIR}/apps/api`)).toBe(true);
    });

    it('fails without --force on existing directory', async () => {
      // Create a directory first
      const EXISTING_DIR = '/tmp/turbokit-e2e-existing';
      if (existsSync(EXISTING_DIR)) {
        await rm(EXISTING_DIR, { recursive: true });
      }

      await $`bun run bin/turbokit.ts \
        --name existing-test \
        --path ${EXISTING_DIR} \
        --web \
        --yes`.cwd(TURBOKIT_DIR).quiet();

      // Try to generate again without --force
      const result = await $`bun run bin/turbokit.ts \
        --name existing-test \
        --path ${EXISTING_DIR} \
        --web \
        --yes`
        .cwd(TURBOKIT_DIR)
        .quiet()
        .nothrow();

      expect(result.exitCode).not.toBe(0);

      // Clean up
      if (existsSync(EXISTING_DIR)) {
        await rm(EXISTING_DIR, { recursive: true });
      }
    });
  });
});
