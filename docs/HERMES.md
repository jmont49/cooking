# Dedicated Miso cooking profile

Use a separate Hermes profile with only the Shua MCP server enabled. It needs no Gmail, personal files, browser history, generic shell mutation, or unrelated connectors.

## Shua tools inside Miso

1. In Shua Settings, create a one-time Miso token with `inventory:read`, `inventory:write`, `recipes:read`, `recipes:write`, `plans:read`, and `plans:write`. The plan scopes let Miso create cohesive weekly prep drafts; Shua still validates every quantity before saving one.
2. Store it as `SHUA_INTEGRATION_TOKEN` in the active Hermes profile's `.env` file. Never commit or paste it into chat.
3. Configure `SHUA_API_URL` and run `node packages/mcp/dist/index.js` as a local stdio MCP server.
4. Treat `confirmation_required` as a stop: show its exact summary and proceed only after the user approves.
5. Review external mutation logs and revoke the token immediately if the profile or laptop is retired or compromised.

## Shua recipe and weekly prep requests handled by Miso

The worker is outbound-only. It checks Supabase for queued recipe requests, calls the local Hermes API at `127.0.0.1:8642`, validates the JSON response, and returns it to Shua. The laptop requires no public port or tunnel.

```bash
npm ci
npm run build -w @mise/contracts
npm run build -w @shua/miso-worker
node --env-file="$HOME/.hermes/.env" apps/miso-worker/dist/apps/miso-worker/src/index.js
```

The Hermes environment needs:

```env
SHUA_API_URL=https://PROJECT.supabase.co/functions/v1/api/v1
SHUA_INTEGRATION_TOKEN=shua_...
MISO_API_URL=http://127.0.0.1:8642/v1
# MISO_API_KEY may be omitted when API_SERVER_KEY is already present.
```

If Miso or the worker is offline, new recipe and prep requests remain queued. Miso never receives a Supabase service-role key or the Unsplash key. Unsplash search happens inside the Supabase function after a recipe passes validation. Weekly prep responses use exact meal and ingredient identifiers; the API recomputes combined totals and rejects unknown meals, excess allocations, or mismatched sums.

Hermes authentication/model settings and Shua integration tokens are unrelated. Never copy Codex OAuth credentials, Hermes model credentials, Supabase service-role keys, or the Unsplash key into browser configuration.
