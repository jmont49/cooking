# Shua

Shua is a warm, personal cooking application for confirming what is in the kitchen, planning meals sequentially, consolidating groceries, cooking offline, and learning from feedback. Inventory arithmetic and planning are deterministic; AI is an optional, review-first service.

## Quick start

Requirements: Node 20+, npm, and Docker for the full local Supabase stack.

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

`VITE_DEMO_MODE=true` runs the complete browser experience from persistent local demo data at http://localhost:5173 with no credentials. Reset it from Settings. This is for development and product evaluation; production uses magic-link auth and Supabase RLS.

For the database and API:

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve api --env-file .env.local --no-verify-jwt
```

Local Studio is at http://127.0.0.1:54323. Copy the values printed by `supabase status` into `.env.local`. Restart Vite after changing browser variables.

## Workspace

- `apps/web`: responsive React PWA and local demo adapter.
- `packages/domain`: fixed-precision deterministic inventory, reservations, groceries, budgets, and recommendations.
- `packages/contracts`: Zod boundary schemas and provider contracts.
- `packages/mcp`: narrow stdio MCP adapter for Hermes or another assistant.
- `supabase`: PostgreSQL migrations, RLS, seed data, Storage policies, transactional RPCs, and the `/api/v1` Edge API.
- `docs`: [architecture](docs/ARCHITECTURE.md), [OpenAPI](docs/openapi.yaml), [deployment](docs/DEPLOYMENT.md), [security](docs/SECURITY.md), and [Hermes setup](docs/HERMES.md).

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run validate:openapi
npm run test:e2e
```

The E2E suite uses deterministic local demo data. Database integration checks require `supabase start` followed by `supabase db reset`.

## AI providers

The default `AI_PROVIDER=mock` performs no network requests and supports recipe drafts, adaptations, feedback proposals, and recommendation explanations. Set the server-only variables `AI_PROVIDER=openai-compatible`, `AI_API_BASE_URL`, `AI_API_KEY`, and model names to use a compatible chat-completions provider. Never prefix these variables with `VITE_`.

All results are schema-validated. Generated recipes are unsaved drafts, interpreted feedback is only a proposal, and receipt lines require acceptance. An AI outage cannot prevent inventory, planning, cooking, groceries, or feedback capture.

## Production

See [deployment instructions](docs/DEPLOYMENT.md). Normal hosting uses Cloudflare Pages for `apps/web/dist`, Supabase for Auth/PostgreSQL/Storage/Edge Functions, and can fit their free tiers apart from optional AI usage.

## Troubleshooting

- **Blank local API data:** run `npx supabase db reset`, then confirm `.env.local` uses values from `npx supabase status`.
- **Magic link does not return:** add the exact application origin to Supabase Auth redirect URLs.
- **AI configuration error:** return to `AI_PROVIDER=mock`; no other feature requires AI.
- **Stale PWA assets:** unregister the development service worker or clear the `mise-pages` cache after a schema-breaking frontend update.
- **MCP exits immediately:** set both `MISE_API_URL` and `MISE_INTEGRATION_TOKEN`; tokens are shown only when created.

## Known boundaries

Receipt scanning is experimental and disabled by default. PWA offline support keeps the shell, recipe content, and cooking progress available; inventory and completion mutations intentionally wait for connectivity. Home Assistant, microphones, wake words, smart lights, voice hardware, paid image generation, and Hermes authentication internals are deferred to a later release.
