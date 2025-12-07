# API Integration Feature Spec

## Overview

Enable seamless integration between the API (Hono on Cloudflare Workers) and client apps (mobile and web) in generated projects.

## Decisions Made

- **Type sharing**: Direct import from `@scope/api` (no separate types package)
- **Local dev networking**: Platform-aware helper that auto-detects simulator/emulator/device
- **Authentication**: None included (users add their own)
- **Data fetching**: TanStack Query for both web and mobile
- **Conditional generation**: 
  - TanStack Query always installed in web/mobile (even without API)
  - If no API selected: QueryProvider only, no `src/api/` folder
  - If API selected: clients import from shared `@scope/api-client` package
- **Shared API client**: `packages/api-client/` contains Hono RPC client and hooks (DRY across web/mobile)
- **Wrangler compatibility**: Use latest stable date at time of implementation

## Current State

### API Template
- Uses Hono framework
- Currently configured for Bun runtime
- Simple health check and root endpoints
- No Cloudflare Workers configuration

### Mobile Template
- Expo SDK 54 with React Native 0.81
- No API client or data fetching setup
- No environment configuration for API URLs

## Goals

1. **Cloudflare Workers deployment** - API should be ready for CF Workers out of the box
2. **Type-safe API client** - Mobile app should have typed API calls
3. **Environment-aware configuration** - Support local dev, staging, production URLs
4. **Developer experience** - Easy local development with both apps running

## Design Decisions

### Runtime: Cloudflare Workers (not Bun)

**Decision**: Switch API template from Bun to Cloudflare Workers

**Rationale**:
- User requirement: APIs will run on Cloudflare
- Hono has first-class Cloudflare Workers support
- Workers provide edge deployment, low latency globally
- Bun can still be used for local dev via `wrangler dev`

**Trade-offs**:
- Lose some Bun-specific features (native SQLite, file system)
- Gain: Edge deployment, D1/KV/R2 access, global distribution

### API Client: Hono RPC + TanStack Query

**Decision**: Use Hono's built-in RPC client for type-safe API calls, wrapped with TanStack Query for data fetching

**Rationale**:
- Hono RPC: Zero additional dependencies, end-to-end type safety
- TanStack Query: Caching, background refetching, loading/error states, devtools
- Same data fetching patterns across web and mobile
- Works with any HTTP client under the hood

**Alternative considered**: tRPC
- More features but heavier, separate ecosystem
- Hono RPC + TanStack Query gives us the best of both worlds

### Environment Configuration

**Decision**: Use environment variables with a shared config pattern

**Mobile (Expo)**:
- `app.config.ts` for environment-aware config
- `expo-constants` for runtime access
- Support for `.env.local` in development

**API (Cloudflare)**:
- `wrangler.toml` for environment bindings
- Secrets via `wrangler secret`

## Technical Specification

### 1. API Template Changes

#### New Files

```
apps/api/
├── src/
│   ├── index.ts          # Main entry, exports app type
│   └── routes/
│       └── health.ts     # Health check route
├── wrangler.toml         # Cloudflare Workers config
├── package.json          # Updated scripts
└── tsconfig.json
```

#### wrangler.toml.template

```toml
name = "{{projectName}}-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[dev]
port = 3001

# Uncomment to add bindings:
# [[d1_databases]]
# binding = "DB"
# database_name = "{{projectName}}-db"
# database_id = "your-database-id"

# [[kv_namespaces]]
# binding = "KV"
# id = "your-kv-id"
```

#### src/index.ts.template (updated)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Define app with typed routes for RPC client
const app = new Hono()
  .use('*', cors())
  .get('/health', (c) => {
    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  })
  .get('/', (c) => {
    return c.json({ 
      message: 'Hello from {{projectName}} API' 
    });
  });

// Export type for RPC client
export type AppType = typeof app;

export default app;
```

#### package.json.template (updated)

```json
{
  "name": "@{{scope}}/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "wrangler": "^3.91.0",
    "typescript": "^5.5.0"
  }
}
```

#### tsconfig.json.template (updated)

```json
{
  "extends": "@{{scope}}/config/tsconfig.node.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

### 2. Shared API Client Package (New)

When `api` module is selected, create a shared package for the Hono RPC client.

```
packages/api-client/
├── src/
│   ├── client.ts         # Hono RPC client factory
│   ├── hooks.ts          # TanStack Query hooks
│   └── index.ts          # Public exports
├── package.json
└── tsconfig.json
```

#### src/client.ts.template

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@{{scope}}/api';

export type { AppType };

// Create typed API client with base URL
export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

export type ApiClient = ReturnType<typeof createApiClient>;
```

#### src/hooks.ts.template

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from './client';

// Factory to create hooks with injected client
export function createApiHooks(api: ApiClient) {
  return {
    useHealth: () =>
      useQuery({
        queryKey: ['health'],
        queryFn: async () => {
          const res = await api.health.$get();
          if (!res.ok) throw new Error('Failed to fetch health');
          return res.json();
        },
      }),

    // Add more hooks as you add API endpoints:
    // useUsers: () => useQuery({ ... }),
  };
}
```

#### src/index.ts.template

```typescript
export { createApiClient, type ApiClient, type AppType } from './client';
export { createApiHooks } from './hooks';
```

#### package.json.template

```json
{
  "name": "@{{scope}}/api-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@{{scope}}/api": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@{{scope}}/config": "workspace:*",
    "typescript": "^5.5.0"
  }
}
```

#### tsconfig.json.template

```json
{
  "extends": "@{{scope}}/config/tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

### 3. Mobile Template Changes

#### New Files (when API is selected)

```
apps/mobile/
├── src/
│   ├── api/
│   │   └── index.ts      # Re-exports from @scope/api-client with configured client
│   ├── config/
│   │   └── env.ts        # Environment configuration (platform-aware)
│   └── providers/
│       └── QueryProvider.tsx  # TanStack Query provider
├── app.config.ts         # Expo config (replaces app.json)
├── .env.example          # Example environment variables
└── ... existing files
```

#### New Files (when API is NOT selected)

```
apps/mobile/
├── src/
│   └── providers/
│       └── QueryProvider.tsx  # TanStack Query provider only
├── app.config.ts
└── ... existing files
```

#### src/api/index.ts.template (only when API selected)

```typescript
import { createApiClient, createApiHooks } from '@{{scope}}/api-client';
import { getApiUrl } from '../config/env';

// Create client with platform-aware URL
export const api = createApiClient(getApiUrl());

// Create and export hooks
const hooks = createApiHooks(api);
export const useHealth = hooks.useHealth;

// Re-export types
export type { ApiClient, AppType } from '@{{scope}}/api-client';
```

#### src/providers/QueryProvider.tsx.template

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### src/config/env.ts.template

```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface AppConfig {
  apiUrl: string;
}

/**
 * Get the appropriate localhost URL for the current platform.
 * - iOS Simulator: localhost works directly
 * - Android Emulator: needs 10.0.2.2 (Android's alias for host loopback)
 * - Physical device: needs the machine's local network IP
 */
function getLocalhostUrl(port: number): string {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine
    return `http://10.0.2.2:${port}`;
  }
  // iOS simulator and web can use localhost
  return `http://localhost:${port}`;
}

function getConfig(): AppConfig {
  const extra = Constants.expoConfig?.extra;
  
  // If API_URL is explicitly set, use it (for production/staging)
  // Otherwise, use platform-aware localhost for development
  const apiUrl = extra?.apiUrl || getLocalhostUrl(3001);
  
  return { apiUrl };
}

export const config = getConfig();

export function getApiUrl(): string {
  return config.apiUrl;
}
```

#### app.config.ts.template (replaces app.json)

```typescript
import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '{{projectName}}',
  slug: '{{projectName}}',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  },
});
```

#### .env.example.template

```
# API URL - defaults to local development
API_URL=http://localhost:3001

# For production builds, use your deployed API URL:
# API_URL=https://your-api.your-domain.workers.dev
```

#### package.json.template (updated)

When API is selected:
```json
{
  "name": "{{projectName}}-mobile",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@{{scope}}/api-client": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "expo": "~54.0.0",
    "expo-constants": "~17.1.0",
    "expo-status-bar": "~3.0.8",
    "react": "19.1.0",
    "react-native": "0.81.5"
  },
  "devDependencies": {
    "@{{scope}}/config": "workspace:*",
    "@types/react": "~19.1.10",
    "dotenv": "^16.4.0",
    "typescript": "{{typescriptVersion}}"
  }
}
```

When API is NOT selected:
```json
{
  "name": "{{projectName}}-mobile",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "dev": "expo start",
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "expo": "~54.0.0",
    "expo-status-bar": "~3.0.8",
    "react": "19.1.0",
    "react-native": "0.81.5"
  },
  "devDependencies": {
    "@{{scope}}/config": "workspace:*",
    "@types/react": "~19.1.10",
    "typescript": "{{typescriptVersion}}"
  }
}
```

#### App.tsx.template (when API selected)

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { QueryProvider } from './src/providers/QueryProvider';
import { useHealth } from './src/api';

function HomeScreen() {
  const { data, isLoading, error } = useHealth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{projectName}}</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      
      {isLoading && <Text style={styles.status}>Connecting to API...</Text>}
      {error && <Text style={styles.error}>API Error: {error.message}</Text>}
      {data && (
        <Text style={styles.status}>
          API Status: {data.status}
        </Text>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <HomeScreen />
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    color: '#22c55e',
  },
  error: {
    fontSize: 14,
    color: '#ef4444',
  },
});
```

#### App.tsx.template (when API NOT selected)

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { QueryProvider } from './src/providers/QueryProvider';

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{projectName}}</Text>
      <Text style={styles.subtitle}>Mobile App</Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <HomeScreen />
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
```

### 4. Web Template Changes

#### New Files (when API is selected)

```
apps/web/
├── src/
│   ├── api/
│   │   └── index.ts      # Re-exports from @scope/api-client with configured client
│   ├── providers/
│   │   └── QueryProvider.tsx  # TanStack Query provider
│   └── ... existing files
├── .env.example          # Example environment variables
└── ... existing files
```

#### New Files (when API is NOT selected)

```
apps/web/
├── src/
│   └── providers/
│       └── QueryProvider.tsx  # TanStack Query provider only
└── ... existing files
```

#### src/api/index.ts.template (only when API selected)

```typescript
import { createApiClient, createApiHooks } from '@{{scope}}/api-client';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Create client
export const api = createApiClient(apiUrl);

// Create and export hooks
const hooks = createApiHooks(api);
export const useHealth = hooks.useHealth;

// Re-export types
export type { ApiClient, AppType } from '@{{scope}}/api-client';
```

#### src/providers/QueryProvider.tsx.template

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### .env.example.template (only when API selected)

```
# API URL - defaults to local development
VITE_API_URL=http://localhost:3001

# For production builds, use your deployed API URL:
# VITE_API_URL=https://your-api.your-domain.workers.dev
```

#### package.json.template (updated dependencies)

When API is selected:
```json
{
  "dependencies": {
    "@{{scope}}/api-client": "workspace:*",
    "@tanstack/react-query": "^5.62.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.62.0"
  }
}
```

When API is NOT selected:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.62.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.62.0"
  }
}
```

#### main.tsx.template (updated with QueryProvider)

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './providers/QueryProvider';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);
```

#### App.tsx.template (when API selected)

```typescript
import { useHealth } from './api';

function App() {
  const { data, isLoading, error } = useHealth();

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>{{projectName}}</h1>
      <p>Web App</p>
      
      <div style={{ marginTop: '1rem' }}>
        {isLoading && <p>Connecting to API...</p>}
        {error && <p style={{ color: '#ef4444' }}>API Error: {error.message}</p>}
        {data && (
          <p style={{ color: '#22c55e' }}>
            API Status: {data.status}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
```

#### App.tsx.template (when API NOT selected)

```typescript
function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>{{projectName}}</h1>
      <p>Web App</p>
    </div>
  );
}

export default App;
```

### 4. Root Configuration Changes

#### turbo.json additions

Add pipeline for API deploy:

```json
{
  "tasks": {
    "deploy": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

### 5. Local Development Setup

#### Root package.json script additions

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:api": "turbo dev --filter=@{{scope}}/api",
    "dev:mobile": "turbo dev --filter={{projectName}}-mobile",
    "deploy:api": "turbo deploy --filter=@{{scope}}/api"
  }
}
```

#### Commands (all use bun)

```bash
# Install dependencies
bun install

# Start all apps
bun run dev

# Start specific apps
bun run dev:api
bun run dev:mobile

# Deploy API to Cloudflare
bun run deploy:api
```

## Implementation Plan

### Phase 1: API Cloudflare Migration
1. Update API `src/index.ts` template with CORS and typed exports
2. Add `wrangler.toml` template
3. Update `package.json` with wrangler scripts (remove Bun deps)
4. Update `tsconfig.json` for Workers types

### Phase 2: Shared API Client Package
1. Create `packages/api-client/` template directory
2. Add `src/client.ts` - Hono RPC client factory
3. Add `src/hooks.ts` - TanStack Query hook factory
4. Add `src/index.ts` - public exports
5. Add `package.json` and `tsconfig.json`

### Phase 3: Web Integration
1. Add `src/providers/QueryProvider.tsx` template (always)
2. Add `src/api/index.ts` template (only when API selected)
3. Update `main.tsx` to wrap app with QueryProvider
4. Create `App.tsx` variants (with/without API)
5. Add `.env.example` template (only when API selected)
6. Update `package.json` with conditional dependencies

### Phase 4: Mobile Integration
1. Add `src/providers/QueryProvider.tsx` template (always)
2. Add `src/api/index.ts` template (only when API selected)
3. Add `src/config/env.ts` template with platform-aware URL (only when API selected)
4. Create `app.config.ts` template (replace `app.json`)
5. Create `App.tsx` variants (with/without API)
6. Add `.env.example` template (only when API selected)
7. Update `package.json` with conditional dependencies

### Phase 5: Root Configuration & DX
1. Update `turbo.json` with deploy task
2. Add convenience scripts to root `package.json`
3. Update README template with API integration docs

### Phase 6: Generator Updates
1. Add conditional file copying logic based on module selection
2. Add `api-client` package to generation when `api` is selected
3. Handle template variants (with-api vs without-api)

## Notes on Physical Device Development

The platform-aware `getLocalhostUrl()` helper handles simulators/emulators automatically. For physical devices, developers need to:

1. Set `API_URL` environment variable to their machine's local IP
2. Example: `API_URL=http://192.168.1.100:3001`
3. Ensure both device and dev machine are on the same network

This is documented in the generated README.

## Success Criteria

1. **Local development works out of the box**:
   - `bun run dev` starts all selected apps (API, web, mobile)
   - Web and mobile can call API endpoints with type safety
   - Android emulator automatically uses correct localhost alias

2. **Type safety end-to-end**:
   - Types flow from API to web/mobile with zero manual sync
   - Adding new API endpoints immediately provides types in clients
   - No build step required for type updates (workspace dependency)

3. **Deployment ready**:
   - API deploys to Cloudflare with `bun run --filter @scope/api deploy`
   - Environment variables configure production API URLs

4. **TanStack Query integration**:
   - QueryProvider wraps both web and mobile apps
   - Example hooks demonstrate the pattern
   - DevTools available in web app
