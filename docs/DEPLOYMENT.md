# Deployment

## Supabase

1. Create a Supabase project and link it with `npx supabase link --project-ref PROJECT`.
2. Apply migrations with `npx supabase db push`.
3. Set server-only secrets from `.env.example` with `npx supabase secrets set --env-file .env.functions`.
4. Deploy the API with `npx supabase functions deploy api --no-verify-jwt`. The function performs user-JWT and integration-token validation itself.
5. Enable magic-link email authentication and add the production application URL to allowed redirects.

## Cloudflare Pages

Use `npm run build -w @mise/web` as the build command and `apps/web/dist` as the output directory. Configure the `VITE_*` variables at build time. Add an SPA fallback from `/*` to `/index.html` with status 200. Proxy `/api/v1/*` to the Supabase function if a same-origin API URL is required; otherwise use `VITE_API_URL` directly.

Secure headers should include CSP limited to the application and Supabase origins, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive Permissions Policy.
