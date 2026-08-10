# Shua MCP adapter

The adapter is a narrow stdio wrapper around the versioned REST API. It cannot access SQL, the filesystem, shell commands, account settings, or provider secrets.

```bash
npm run build -w @mise/mcp
MISE_API_URL=https://YOUR_PROJECT.supabase.co/functions/v1/api/api/v1 \
MISE_INTEGRATION_TOKEN=mise_TOKEN node packages/mcp/dist/index.js
```

Configure this command only in a dedicated Hermes cooking profile. Confirmation-required responses are returned intact; repeat the tool with the supplied short-lived `confirmationToken` only after the user approves the summary.
