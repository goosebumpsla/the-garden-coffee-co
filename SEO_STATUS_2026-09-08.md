# The Garden Coffee Co. SEO and migration status

Evidence captured September 8, 2026. This is a handoff record, not a ranking guarantee.

## Technical SEO

- The seven canonical sitemap pages return HTTP 200 on the production domain through the Garden-owned Cloudflare zone and Worker.
- Each page has a unique title and description, one H1, a self-referencing canonical, complete Open Graph and Twitter metadata, valid JSON-LD, internal links, image alt text, and intrinsic image dimensions.
- `robots.txt` allows crawling and names the production sitemap. The sitemap contains all seven canonical URLs.
- An unknown URL returns HTTP 404. Repository/private files tested on the preview also return 404.
- The preview hostname sends `X-Robots-Tag: noindex, nofollow`; the production custom domain does not.
- HTTPS is active with a Cloudflare-managed certificate covering the apex and wildcard hostnames.
- HTTP redirects to HTTPS with a permanent 301, and `www` redirects to the apex with a permanent 301. Both rules preserve the requested path and query string.

## Tests and performance

- `npm test`: 13 passing tests, including sitemap-driven SEO coverage, structured-data parsing, asset existence, internal discoverability, form privacy, CAPI consent, and Cloudflare configuration.
- The production audit verifies exact committed-source matches for all seven canonical pages, indexable response headers, `robots.txt`, the sitemap, branded/private-path 404 behavior, and canonical HTTP/`www` redirects.
- Local Lighthouse on all seven pages: 100 Accessibility, 100 SEO, and 100 Best Practices.
- Local mobile homepage Lighthouse performance: 93.
- Remote owner-preview homepage Lighthouse: 84 Performance, 100 Accessibility, and 100 Best Practices. Its SEO score is reduced by the intentional preview `noindex` header.
- Mobile 390px layout has no horizontal overflow. Hero video loads, the quote form renders, and browser-console checks found no errors.

## Search Console

- Domain ownership is verified through the preserved Google DNS TXT record.
- `https://thegardencoffeecart.com/sitemap.xml` is successful with seven discovered URLs.
- All seven canonical URLs were individually reinspected after the Cloudflare cutover.
- The homepage, Weddings, and Gallery are indexed and can appear in Google Search.
- The Blog index was last crawled successfully by Googlebot smartphone on September 8, 2026 at 2:30 PM Pacific but remains `Crawled — currently not indexed`.
- The wedding and cost articles remain `Discovered — currently not indexed`. The catering guide was still reported as unknown to Google.
- Indexing was requested and Google confirmed priority-crawl queue placement for the Blog index and all three articles after the production cutover. Repeated submissions will not increase their priority.
- The aggregate Page Indexing overview still showed one indexed page and three excluded pages because that report had not yet refreshed to reflect the individual URL Inspection results.

## Google Business Profile

- `The Garden Coffee Co.` is verified as a service-area business.
- Website: `https://thegardencoffeecart.com/` is current.
- Instagram: `https://instagram.com/thegardencoffee.co` is accepted and shown normally in the Business Profile editor with no pending-review notice.
- Weddings services link: `https://thegardencoffeecart.com/weddings/` is approved and publicly visible on the profile as its service/menu link.
- All existing service areas were preserved, including the broader areas where travel carries an additional charge.
- Hours still show open 24 hours. They remain unresolved until the owner supplies accurate customer-contact hours.
- Opening month/year remains unresolved until the owner supplies it.

## Deployment and Cloudflare migration

- GitHub `main` includes the latest SEO, accessibility, Cloudflare migration, and verification work.
- Garden-owned Cloudflare account: `contact.thegardenco@gmail.com`.
- Owner-account preview: `https://the-garden-coffee-co.contact-thegardenco.workers.dev`.
- Cloudflare Free zone is created and its production CAPI token is stored as an encrypted Worker secret, not in source control.
- Assigned Cloudflare nameservers: `boyd.ns.cloudflare.com` and `sonia.ns.cloudflare.com`.
- Squarespace now delegates the domain to `boyd.ns.cloudflare.com` and `sonia.ns.cloudflare.com`. The `.com` registry reflects that delegation; recursive resolvers may temporarily retain the previous two-day NS cache during propagation.
- The Cloudflare zone is active. Apex and `www` DNS records are proxied, the Google verification TXT record is preserved, and both host patterns route to the `the-garden-coffee-co` Worker.
- Cloudflare Always Use HTTPS is enabled. A deployed Redirect Rule canonicalizes `www` to the apex while preserving path and query string.
- The production domain now serves the current site through Cloudflare. All seven live pages match their committed HTML exactly and are indexable.
- Netlify remains available only as a rollback copy. Its production deploy is still pinned to `ceb77a8`, and new builds remain skipped because the team exhausted its current billing-cycle credits. That Netlify limitation no longer blocks the live site.
- The authoritative Netlify DNS inventory is backed up in `DNS_ZONE_BACKUP.md`. It contains two Netlify site records and the Google verification TXT; no MX records or signed DNSSEC delegation were present.
- Squarespace registrar access was recovered through the domain-owner account, and the nameserver change was completed September 8, 2026 at 4:22 PM Pacific.
- Keep the Netlify deployment intact as a temporary rollback until the owner is satisfied with production and the remaining Google checks are complete.

## Authority work

`LOCAL_SEO_AUTHORITY_PLAN.md` contains a 90-day, evidence-based plan for genuine reviews, first-hand event content, real venue/vendor relationships, Business Profile maintenance, and measurement. It prohibits fabricated reviews, incentivized reviews, fake locations, purchased links, and thin city pages.

## Production acceptance checklist

Completed:

1. Attached apex and `www` to the Worker; `www` redirects to apex while preserving path and query.
2. Confirmed every canonical page, `robots.txt`, sitemap, assets, and branded/private-path 404 behavior over HTTPS.
3. Confirmed the production domain has no preview `X-Robots-Tag` header.
4. Re-ran the 13 repository tests and live HTTP audit after cutover.

Remaining:

1. Perform one owner-approved real form-delivery test and verify the optional browser/server Meta event is deduplicated when consent is granted.
2. Allow Google time to recrawl and process the four queued Blog URLs; recheck Search Console later without repeatedly resubmitting them.
