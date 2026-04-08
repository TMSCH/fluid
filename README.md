# Fluid

LLM-powered personal mini-app runtime. Create personal tools by chatting with an AI.

## Setup

```bash
pnpm install
```

## Run

```bash
# Web
pnpm web

# iOS
pnpm ios

# Android
pnpm android
```

## Architecture

- **Expo + React Native + Expo Router** - Universal app (iOS, Android, Web)
- **SQLite** - Local persistence for projects, definitions, states, snapshots
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
playwright/             # E2E tests for web
```

## E2E Tests

```bash
pnpm test:e2e
```
