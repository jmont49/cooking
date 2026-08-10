# Security and operations

- Every user-owned table has RLS; global ingredient rows are authenticated read-only.
- The browser receives only the Supabase anonymous key. Service-role, AI, token-pepper, and integration secrets are Edge Function variables.
- Integration tokens contain at least 256 bits of randomness, are pepper-hashed at rest, scoped, expirable, revocable, and displayed once.
- External mutations require idempotency keys and create audit events. Large or ambiguous operations require short-lived one-time confirmation.
- Private Storage paths begin with the authenticated user ID. Images are restricted to JPEG, PNG, or WebP and 5 MiB (receipts 10 MiB); the web client should resize uploads to 2048 px before transfer.
- AI output is schema-validated and rendered as text, never raw HTML. Logs exclude credentials and original images.

For backup, use `supabase db dump --project-ref PROJECT > mise-backup.sql` and export private Storage separately. Test restoration in a non-production project. Rotate the integration-token pepper only with a planned revocation of existing integration tokens.
