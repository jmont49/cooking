# Dedicated Hermes cooking profile

Use a separate Hermes profile with only the Shua MCP server enabled. It needs no Gmail, personal files, internship data, browser history, or shell tool.

1. Sign in to Shua and create a token named `Hermes cooking` with only the scopes needed. Start read-only and add mutation scopes individually.
2. Copy the token at creation; it is never shown again. Store it in Hermes's secret/environment facility, outside this repository.
3. Configure `MISE_API_URL` and `MISE_INTEGRATION_TOKEN`, then run `node packages/mcp/dist/index.js` as a stdio MCP server.
4. Treat `confirmation_required` as a stop: show its exact summary and proceed only after the user approves.
5. Review external mutation logs in Shua. Revoke the token immediately if the profile or machine is retired or compromised.

Hermes authentication/model settings and Shua's optional AI provider are unrelated. Never copy Codex OAuth credentials, Hermes model credentials, or Supabase service-role keys into the client or MCP configuration.
