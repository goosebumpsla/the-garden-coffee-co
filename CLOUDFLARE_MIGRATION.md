# Cloudflare migration

Prepared September 8, 2026. Existing Netlify configuration is retained for rollback.

## Deployment

- Free Workers plan with static assets. No R2, Stream, database or paid add-ons.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker name: `the-garden-coffee-co`
- Output is `dist-cloudflare/`, generated from a strict allowlist of tracked public website files.
- `npm test` exercises both Netlify and Cloudflare adapters with mocked outbound requests.
- The existing `/.netlify/functions/meta-lead` URL is supported on Cloudflare so cached browser scripts keep working.
- Add `META_CAPI_ACCESS_TOKEN` as a Cloudflare Worker **secret**, never a plain variable, build asset or source file. Rotate the previously shared token before cutover. Optional `META_CAPI_TEST_EVENT_CODE` is only for an explicitly approved test, then remove it.

## Before DNS cutover

1. Deploy to the Workers preview address and verify pages, videos, real 404s, headers, and form behavior. Preview pages must be noindex; optional Meta tracking stays off outside the production domain.
2. Add and test the CAPI secret. Do not send fake production leads or treat the calendar opening as a booked call.
3. Inventory/export all existing DNS records from the DNS provider; DNS queries alone are not a full zone backup. Preserve verification TXT, email-related records, and any subdomains.
4. Add the domain on Cloudflare Free, compare imported DNS against the export, and handle DNSSEC safely if enabled. Only then switch nameservers at the registrar.
5. Add apex and www as Worker custom domains. Keep paths and canonical URLs unchanged; redirect www to apex.
6. Verify HTTPS, robots/sitemap, mobile form delivery (with an approved test), and Pixel/CAPI deduplication on the real domain. Update the privacy notice to identify the active hosting provider.
7. Keep Netlify and its deployment intact until the production checks pass. Do not delete DNS records or cancel hosting as part of the initial move.

## Remaining external requirements

Cloudflare repository connection, production secret, complete DNS inventory and registrar access, and successful production verification must all be confirmed before claiming migration complete. Free quotas still apply; do not enable paid upgrades automatically.
