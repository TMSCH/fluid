# Fluid

LLM-powered personal mini-app runtime. Create personal tools by chatting with an AI.

## Setup

```bash
pnpm install
cp .env.example .env
```

Add your OpenAI API key to `.env`:

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here
```

When the env var is set, the app skips the API key setup screen and goes straight to the project list.

## Run

```bash
# iOS (direct OpenAI API calls work natively)
pnpm ios

# Android (direct OpenAI API calls work natively)
pnpm android

# Web (needs CORS proxy for OpenAI calls)
node scripts/api-proxy.js &   # start CORS proxy on port 3001
pnpm web
```

### Web CORS note

Browsers block direct calls to `api.openai.com` due to CORS. On web, the app needs the included CORS proxy (`scripts/api-proxy.js`) running on port 3001. On iOS/Android, API calls go directly to OpenAI with no proxy needed.

### Demo mode

Enter `demo` as the API key (or set `EXPO_PUBLIC_OPENAI_API_KEY=demo`) to use the built-in mock LLM. This generates a working Todo app without any external API calls.

## Architecture

- **Expo + React Native + Expo Router** - Universal app (iOS, Android, Web)
- **SQLite** - Local persistence on native; in-memory on web
- **Constrained UI DSL** - JSON schema rendered by native components (no runtime code eval)
- **OpenAI API** - Direct client-side LLM calls (prototype mode)
- **Zod** - Validation for all LLM response contracts

## Project Structure

```
app/                    # Expo Router screens
src/
  components/           # Shared UI components
  features/
    projects/           # Project lifecycle and management
    renderer/           # UI DSL -> React Native renderer
    llm/                # Prompt builder, API client, response parser
    storage/            # SQLite schema and repositories
    validation/         # Zod schemas for contracts
    rollback/           # Snapshot and restore
  types/                # TypeScript type definitions
  lib/                  # Utilities and context providers
scripts/                # CORS proxy for web
playwright/             # E2E tests for web
```

## E2E Tests

```bash
npx playwright install chromium  # first time only
cd playwright
npx playwright test --reporter=line
```
