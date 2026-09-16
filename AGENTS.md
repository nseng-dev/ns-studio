# Repository Guidelines

## Project Structure & Module Organization

This is an npm workspaces monorepo for NS Studio.

- `apps/web`: Angular shell application, routing, and micro front-end host.
- `apps/profile`: standalone Angular profile micro front-end served under `/remotes/profile/`.
- `apps/api`: Cloudflare Worker API and local Node dev entrypoint.
- `modules/profile/contract`: shared profile types, validation, data, and tests.
- `modules/profile/ui`: reusable Angular profile UI.
- `modules/profile/api`: profile API module.
- `packages/ui`: shared SCSS tokens and base UI styling.
- `scripts/compose-remotes.mjs`: copies built remotes into the shell output.

## Build, Test, and Development Commands

Use Node from `.nvmrc` first: `nvm use`.

- `npm run dev`: builds the contract, then starts API, profile, and shell.
- `npm run dev:web`: starts only the Angular shell.
- `npm run dev:profile`: starts only the profile remote on port `4201`.
- `npm run dev:api`: starts the Worker API in watch mode.
- `npm run build`: builds contract, profile remote, shell, then composes remotes.
- `npm run test`: runs Node tests for the profile contract.
- `npm run format`: formats the repository with Prettier.
- `npm run deploy`: builds, composes remotes, and deploys with Wrangler.

## Coding Style & Naming Conventions

TypeScript is ESM-first (`"type": "module"`). Prefer existing Angular standalone patterns and keep boundaries clear: contracts expose types/data, UI owns rendering, apps wire runtime behavior. Use SCSS and shared tokens from `packages/ui/src`. Prettier enforces single quotes and `printWidth: 100`; run `npm run format` before commits.

Workspace packages use the `@ns-studio/*` scope. Keep filenames aligned with local patterns, for example `profile-page.ts`, `profile-page.scss`, and `profile.test.ts`.

## Testing Guidelines

Tests use Node’s built-in test runner with `tsx`. Place contract tests in `modules/<module>/contract/test/*.test.ts`. Add or update tests when changing validation, profile data shape, shared contracts, or API behavior. Run `npm run test` plus `npm run build` before deployment changes.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages, for example `Fix visible profile background animation`. Follow that style: describe the user-visible or architectural change in one line.

Pull requests should include a concise summary, validation commands run, deployment notes when relevant, and screenshots for visible UI changes. Link related issues when available and call out any Cloudflare or routing changes explicitly.

## Security & Configuration Tips

Do not commit secrets, Wrangler credentials, or generated local editor settings. Keep deployment configuration in `wrangler.jsonc`, and verify public routes such as `/profile` after deploy.
