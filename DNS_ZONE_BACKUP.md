# DNS zone backup: thegardencoffeecart.com

Captured from the authoritative Netlify DNS dashboard on September 8, 2026, before any Cloudflare nameserver cutover.

| Host | TTL | Type | Value |
| --- | ---: | --- | --- |
| `thegardencoffeecart.com` | 3600 | `NETLIFY` | `resplendent-salmiakki-b66e4c.netlify.app` |
| `www.thegardencoffeecart.com` | 3600 | `NETLIFY` | `resplendent-salmiakki-b66e4c.netlify.app` |
| `thegardencoffeecart.com` | 3600 | `TXT` | `google-site-verification=D5mzkl2gJbL7GAmS0p6O_JlYuum17VD2jQgjSy0qGsk` |

## Delegation and registrar

- Registrar: Squarespace Domains LLC
- Nameservers: `dns1.p05.nsone.net`, `dns2.p05.nsone.net`, `dns3.p05.nsone.net`, `dns4.p05.nsone.net`
- DNSSEC: unsigned
- Registry expiration: December 23, 2028

Public DNS queries also showed no MX, AAAA, CAA, DMARC, or autodiscover records at capture time. The Netlify dashboard list above is the authoritative migration inventory.

Keep the Netlify zone and deployment intact until the Cloudflare production checks pass.
