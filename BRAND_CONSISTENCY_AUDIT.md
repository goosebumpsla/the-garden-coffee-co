# Brand consistency audit — September 8, 2026

Scope: homepage, weddings, corporate events, gallery, journal, all four articles, privacy notice and 404 page.

Fixed: the wedding-only logo reduction, separate corporate header, missing mobile navigation on secondary pages, different primary button colors, inconsistent footer identity and links, and an unstyled 404 page. All pages now load css/brand.css and js/site-shell.js for shared presentation and mobile menu behavior.

Verified at 320, 390, 768 and 1440px: matching logo dimensions and header heights across all eleven views, four consistent main navigation destinations, footer presence, no horizontal overflow, no browser script errors, working menu opening and Escape dismissal. At 1440px the logo is 203px and header 76px; at 390px they are 153px and 68px. Very narrow phones use a 120px logo so the quote button and menu remain available.

Page-specific hero compositions and copy are intentional. Weddings retains its date-check CTA and wedding media; corporate events retains its business-event content; journal pages retain article typography. These pages share brand colors, fonts, header, footer and primary button treatment.

Regression coverage checks shared style/script inclusion, navigation destinations, mobile menu and privacy controls on every page. Advertising consent behavior is preserved.

Publishing must verify Cloudflare directly as well as ordinary domain resolution during the Netlify-to-Cloudflare DNS transition. Cached Netlify responses can still show the previous site even after the current Cloudflare deployment is verified.
