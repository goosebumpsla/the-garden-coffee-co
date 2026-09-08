# The Garden Coffee Co. SEO and migration status

Evidence captured September 8, 2026. This is a handoff record, not a ranking guarantee.

## Technical SEO

- The seven canonical sitemap pages return HTTP 200 on the Garden-owned Cloudflare preview.
- Each page has a unique title and description, one H1, a self-referencing canonical, complete Open Graph and Twitter metadata, valid JSON-LD, internal links, image alt text, and intrinsic image dimensions.
- `robots.txt` allows crawling and names the production sitemap. The sitemap contains all seven canonical URLs.
- An unknown URL returns HTTP 404. Repository/private files tested on the preview also return 404.
- The preview hostname sends `X-Robots-Tag: noindex, nofollow`; this is intentional and must not be carried onto the production custom domain.
- HTTPS and canonical host behavior must be reverified after the production DNS cutover.

## Tests and performance

- `npm test`: 13 passing tests, including sitemap-driven SEO coverage, structured-data parsing, asset existence, internal discoverability, form privacy, CAPI consent, and Cloudflare configuration.
- Local Lighthouse on all seven pages: 100 Accessibility, 100 SEO, and 100 Best Practices.
- Local mobile homepage Lighthouse performance: 93.
- Remote owner-preview homepage Lighthouse: 84 Performance, 100 Accessibility, and 100 Best Practices. Its SEO score is reduced by the intentional preview `noindex` header.
- Mobile 390px layout has no horizontal overflow. Hero video loads, the quote form renders, and browser-console checks found no errors.

## Search Console

- Domain ownership is verified through the preserved Google DNS TXT record.
- `https://thegardencoffeecart.com/sitemap.xml` is successful with seven discovered URLs.
- Indexing was requested for all seven canonical URLs.
- The homepage is indexed. The six newer URLs were reported as `Discovered — currently not indexed` when inspected and remain subject to Google processing.
- The aggregate Page Indexing report showed one indexed page and three excluded redirect variants, with a last-update date of September 3, 2026—before the new-page submissions.

## Google Business Profile

- `The Garden Coffee Co.` is verified as a service-area business.
- Website: `https://thegardencoffeecart.com/` is current.
- Instagram: `https://instagram.com/thegardencoffee.co` was submitted and is pending Google review.
- Weddings services link: `https://thegardencoffeecart.com/weddings/` is populated in the edit form but not saved; saving requires explicit action-time approval because it changes the public profile.
- All existing service areas were preserved, including the broader areas where travel carries an additional charge.
- Hours still show open 24 hours. They remain unresolved until the owner supplies accurate customer-contact hours.
- Opening month/year remains unresolved until the owner supplies it.

## Deployment and Cloudflare migration

- GitHub `main` includes the latest SEO/accessibility work at commit `cfbe9bb`.
- Garden-owned Cloudflare account: `contact.thegardenco@gmail.com`.
- Owner-account preview: `https://the-garden-coffee-co.contact-thegardenco.workers.dev`.
- Cloudflare Free zone is created and its production CAPI token is stored as an encrypted Worker secret, not in source control.
- Assigned Cloudflare nameservers: `boyd.ns.cloudflare.com` and `sonia.ns.cloudflare.com`.
- Production still resolves through Netlify. Netlify production is pinned to `ceb77a8`; its deploy trigger is disabled because the team exhausted its current billing-cycle credits. No paid upgrade was made.
- The authoritative Netlify DNS inventory is backed up in `DNS_ZONE_BACKUP.md`. It contains two Netlify site records and the Google verification TXT; no MX records or signed DNSSEC delegation were present.
- Final cutover is blocked on logging into the Squarespace registrar, replacing the four Netlify nameservers with the two Cloudflare nameservers, and then completing Worker custom-domain/redirect/HTTPS verification.
- Keep the Netlify deployment and zone intact until Cloudflare production checks pass.

## Authority work

`LOCAL_SEO_AUTHORITY_PLAN.md` contains a 90-day, evidence-based plan for genuine reviews, first-hand event content, real venue/vendor relationships, Business Profile maintenance, and measurement. It prohibits fabricated reviews, incentivized reviews, fake locations, purchased links, and thin city pages.

## Production acceptance checklist

After the Squarespace nameserver change propagates:

1. Attach apex and `www` to the Worker; make `www` redirect to apex while preserving path and query.
2. Confirm every canonical page, `robots.txt`, sitemap, assets, and the branded 404 over HTTPS.
3. Confirm the production domain has no preview `X-Robots-Tag` header.
4. Run the 13 repository tests and live HTTP audit again.
5. Perform one owner-approved real form-delivery test and verify the optional browser/server Meta event is deduplicated when consent is granted.
6. Reinspect all seven production URLs in Search Console only after the new deployment is live; request indexing again only if Google indicates it is appropriate and quota permits.
