# Cloudflare migration

Prepared September 8, 2026. Existing Netlify configuration is retained for rollback.

## Earlier preview validation (separate SEO task)

- Earlier preview deployed at `https://the-garden-coffee-co.mute-pine-597c.workers.dev`; superseded by the owner-account deployment below. Do not use that account for the domain cutover.
- All seven sitemap URLs, `robots.txt`, and `sitemap.xml` return HTTP 200; an unknown URL returns the branded HTTP 404 page.
- The preview hostname sends `X-Robots-Tag: noindex, nofollow`; production custom-domain responses remain indexable.
- Desktop and 390px mobile layouts were checked with no horizontal overflow. The homepage video loaded, the quote form rendered, and the browser console showed no errors.
- Netlify's authoritative DNS zone was inventoried on September 8, 2026. It contains only the apex and `www` Netlify routing records plus the Google Search Console verification TXT record. See `DNS_ZONE_BACKUP.md`.
- The registrar is Squarespace Domains LLC. DNSSEC is unsigned.

## Current status — September 8, 2026

- Deployed preview: https://the-garden-coffee-co.contact-thegardenco.workers.dev
- Owner: `contact.thegardenco@gmail.com`; account `fa8f38e8680cea78962368c580c63f6c`.
- Wrangler directory profile: `garden-coffee` (separate from Goosebumps default login).
- `META_CAPI_ACCESS_TOKEN` stored as an encrypted Worker secret through the dashboard. Its value is not in this repository. Rotate the token shared in chat; no real Meta receipt test has been performed.
- Hosted pages, robots/sitemap, private-file 404s and preview-only noindex header verified. Nine automated tests pass with mocked network calls. Real inquiry delivery and cross-device video playback still need final acceptance testing.
- Domain added on Cloudflare Free. **Nameservers are not changed; production still uses Netlify.** No paid add-ons enabled.
- Assigned nameservers: `boyd.ns.cloudflare.com`, `sonia.ns.cloudflare.com`.
- Registrar is Squarespace Domains LLC. Registrar login required to finish; login page opened in Garden Coffee Chrome profile.
- GitHub automatic deployment is not connected; current deployment was made directly with Wrangler.

## DNS inventory before cutover

Netlify DNS dashboard contained three records (TTL 3600):

| Name | Type | Value |
| --- | --- | --- |
| @ | NETLIFY | resplendent-salmiakki-b66e4c.netlify.app |
| www | NETLIFY | resplendent-salmiakki-b66e4c.netlify.app |
| @ | TXT | google-site-verification=D5mzkl2gJbL7GAmS0p6O_JlYuum17VD2jQgjSy0qGsk |

Existing authoritative nameservers: `dns1.p05.nsone.net` through `dns4.p05.nsone.net`. Registrar RDAP reports no signed DNSSEC delegation. No MX records were present.

Cloudflare imported the matching Google TXT and four resolved Netlify A records (apex: `18.208.88.157`, `98.84.224.111`; www: `52.52.192.191`, `13.52.188.95`). These are temporary imported origin records, **not Worker custom domains**. Replace website records through Worker custom-domain setup, configure www-to-apex redirect, and check SSL before declaring the website migrated. Do not delete the Google TXT or Netlify zone.

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

1. Preview pages, 404s and headers checked. Finish cross-device video playback and approved live form delivery testing. Preview pages must stay noindex; optional Meta tracking stays off outside the production domain.
2. Add and test the CAPI secret. Do not send fake production leads or treat the calendar opening as a booked call.
3. ~~Inventory/export all existing DNS records from the DNS provider; DNS queries alone are not a full zone backup. Preserve verification TXT, email-related records, and any subdomains.~~ Completed September 8, 2026; the exact authoritative-zone inventory is recorded in `DNS_ZONE_BACKUP.md`.
4. Add the domain on Cloudflare Free, compare imported DNS against the export, and handle DNSSEC safely if enabled. Only then switch nameservers at the registrar.
5. Add apex and www as Worker custom domains. Keep paths and canonical URLs unchanged; redirect www to apex.
6. Verify HTTPS, robots/sitemap, mobile form delivery (with an approved test), and Pixel/CAPI deduplication on the real domain. Update the privacy notice to identify the active hosting provider.
7. Keep Netlify and its deployment intact until the production checks pass. Do not delete DNS records or cancel hosting as part of the initial move.

## Remaining external requirements

Registrar access, Worker custom domains, www redirect, successful production verification, and optional automatic repository deployment remain outstanding. The production secret and DNS inventory are now recorded above. Free quotas still apply; do not enable paid upgrades automatically.

## Compatibility repair — September 9, 2026

The registrar now delegates to Cloudflare (`boyd.ns.cloudflare.com` and `sonia.ns.cloudflare.com`), and Cloudflare serves the Worker custom domain. Some local resolvers still held the former Netlify nameserver delegation and therefore reached the old site. The inactive Netlify DNS zone has been converted from its two `NETLIFY` website records to low-TTL A-record fallbacks for both the apex and `www`, using Cloudflare's current addresses (`104.21.54.216` and `172.67.142.216`). The Google Search Console verification TXT was retained unchanged. Direct checks against both the Netlify legacy nameservers and Cloudflare return the current Worker site; `www` redirects to the apex. Retain this compatibility zone until stale delegations have aged out, then review it before any removal.
