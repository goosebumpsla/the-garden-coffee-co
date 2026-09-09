const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const nodePath = require('node:path');

const root = nodePath.join(__dirname, '..');
const origin = 'https://thegardencoffeecart.com';
const read = file => fs.readFileSync(nodePath.join(root, file), 'utf8');
test('homepage service tiles use local refreshed media and one deferred silent loop', () => {
  const html = read('index.html');
  const section = html.slice(html.indexOf('<!-- ===== SERVICES ===== -->'), html.indexOf('<!-- ===== PLANNING GUIDES ===== -->'));
  assert.equal((section.match(/class="service-card service-card--/g) || []).length, 4);
  assert.equal((section.match(/<video /g) || []).length, 1);
  assert.match(section, /muted loop playsinline preload="none"/);
  assert.match(section, /href="\/weddings\/"/);
  assert.match(section, /href="\/corporate-events\/"/);
  for (const match of section.matchAll(/(?:src|data-src|poster)="(\/assets\/home-services\/[^"?]+)"/g)) assert.ok(fs.existsSync(nodePath.join(root, match[1])), match[1]);
});
test('wedding page uses supplied wedding media with deferred video and responsive photos', () => {
  const html = read('weddings/index.html');
  const videos = [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map(match => match[0]);
  assert.equal(videos.length, 3);
  for (const video of videos) {
    assert.match(video, /preload="none"/);
    assert.match(video, /data-src="\/assets\/weddings\//);
    assert.match(video, /poster="\/assets\/weddings\//);
  }
  assert.match(html, /class="w-hero__image"/);
  assert.match(html, /wedding-hero-480\.webp 480w/);
  assert.doesNotMatch(html, /class="w-hero__video"/);
  for (const match of html.matchAll(/(?:src|data-src|poster)="(\/assets\/weddings\/[^"?]+)"/g)) {
    assert.ok(fs.existsSync(nodePath.join(root, match[1])), match[1]);
  }
  for (const name of ['wedding-hero', 'hero-photo', 'thompsons-cart', 'thompsons-details', 'matcha-mimosas-guest', 'matcha-mimosas-cart', 'matcha-mimosas-details', 'monogrammed-matcha', 'custom-wedding-menu', 'vineyard-cart']) assert.ok(html.includes(name + '-480.webp'));
  assert.doesNotMatch(html, /wedding-service-480\.webp/);
  assert.doesNotMatch(html, /facetune-wedding|wedding-hero-v2/);
});
const attribute = (html, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1];
};
const canonicalToFile = canonical => {
  const pathname = new URL(canonical).pathname;
  return pathname === '/' ? 'index.html' : `${pathname.slice(1)}index.html`;
};
const normalizeInternal = (href, base) => {
  if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) return null;
  const url = new URL(href, base);
  if (url.origin !== origin) return null;
  url.hash = '';
  url.search = '';
  return url.href;
};

const sitemap = read('sitemap.xml');
const sitemapEntries = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)]
  .map(([, canonical, lastmod]) => ({ canonical, lastmod, file: canonicalToFile(canonical) }));

test('every page shares brand assets, navigation destinations and privacy controls', () => {
  for (const file of [...sitemapEntries.map(entry => entry.file), 'privacy/index.html', 'cloudflare/404.html']) {
    const html = read(file);
    assert.match(html, /href="\/css\/brand\.css\?v=/, file);
    assert.match(html, /src="\/js\/site-shell\.js\?v=/, file);
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1];
    assert(header, file + ' shared header');
    for (const destination of ['/weddings/', '/corporate-events/', '/gallery/', '/blog/']) {
      assert(header.includes('href="' + destination + '"'), file + ' navigation destination');
    }
    assert.match(header, /<details class="site-menu">/, file + ' mobile menu');
    assert.match(html, /<footer class="site-footer">/, file + ' shared footer');
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)[1];
    assert.equal((footer.match(/data-privacy-settings/g) || []).length, 1, file + ' footer privacy control');
  }
});

test('sitemap contains the intended canonical pages with current valid dates', () => {
  assert.equal(sitemapEntries.length, 9);
  assert.equal(new Set(sitemapEntries.map(entry => entry.canonical)).size, 9);
  for (const entry of sitemapEntries) {
    assert(entry.canonical.startsWith(`${origin}/`));
    assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/);
    assert(!Number.isNaN(Date.parse(`${entry.lastmod}T00:00:00Z`)));
    assert(fs.existsSync(nodePath.join(root, entry.file)), `${entry.file} must exist`);
  }
  const robots = read('robots.txt');
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, new RegExp(`Sitemap:\\s*${origin.replaceAll('.', '\\.')}\/sitemap\\.xml`, 'i'));
  const generalRules = robots.match(/User-agent:\s*\*([\s\S]*?)(?=\nUser-agent:|\nSitemap:|$)/i)?.[1] || '';
  assert.doesNotMatch(generalRules, /Disallow:\s*\//i);
  assert.match(robots, /User-agent:\s*Google-Extended\s*\nDisallow:\s*\//i);
});

test('every sitemap page has complete, unique, indexable metadata and valid structured data', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const { canonical, file } of sitemapEntries) {
    const html = read(file);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1].trim();
    const description = attribute(html, 'description');
    const canonicalHref = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
    const h1s = [...html.matchAll(/<h1\b[^>]*>/gi)];
    assert(title && title.length >= 30 && title.length <= 65, `${file} title length`);
    assert(description && description.length >= 120 && description.length <= 170, `${file} description length`);
    assert(!titles.has(title), `${file} title must be unique`);
    assert(!descriptions.has(description), `${file} description must be unique`);
    titles.add(title);
    descriptions.add(description);
    assert.equal(canonicalHref, canonical, `${file} canonical`);
    assert.equal(h1s.length, 1, `${file} must contain one H1`);
    assert.doesNotMatch(html, /<meta[^>]+(?:name|property)=["']robots["'][^>]+noindex/i, `${file} must remain indexable`);

    assert.equal(attribute(html, 'og:title'), title, `${file} Open Graph title`);
    assert(attribute(html, 'og:description'), `${file} Open Graph description`);
    assert.match(attribute(html, 'og:image') || '', /^https:\/\//, `${file} Open Graph image`);
    assert.equal(attribute(html, 'og:url'), canonical, `${file} Open Graph URL`);
    assert.match(attribute(html, 'og:type') || '', /^(?:website|article)$/, `${file} Open Graph type`);
    assert.equal(attribute(html, 'og:locale'), 'en_US', `${file} Open Graph locale`);
    assert.equal(attribute(html, 'twitter:card'), 'summary_large_image', `${file} Twitter card`);
    assert.equal(attribute(html, 'twitter:title'), title, `${file} Twitter title`);
    assert(attribute(html, 'twitter:description'), `${file} Twitter description`);
    assert.match(attribute(html, 'twitter:image') || '', /^https:\/\//, `${file} Twitter image`);

    const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert(schemas.length > 0, `${file} structured data`);
    for (const [, schema] of schemas) assert.doesNotThrow(() => JSON.parse(schema), `${file} structured data must parse`);
  }
});

test('sitemap pages are internally discoverable and local images have dimensions and alt text', () => {
  const inbound = new Map(sitemapEntries.map(entry => [entry.canonical, new Set()]));
  for (const { canonical, file } of sitemapEntries) {
    const html = read(file);
    const hrefs = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)].map(match => normalizeInternal(match[1], canonical)).filter(Boolean);
    for (const href of hrefs) if (inbound.has(href) && href !== canonical) inbound.get(href).add(canonical);
    assert(hrefs.some(href => inbound.has(href)), `${file} must link to another sitemap page`);

    for (const [imageTag] of html.matchAll(/<img\b[^>]*>/gi)) {
      assert.match(imageTag, /\balt=["'][^"']*["']/i, `${file} image alt`);
      assert.match(imageTag, /\bwidth=["']?\d+/i, `${file} image width`);
      assert.match(imageTag, /\bheight=["']?\d+/i, `${file} image height`);
      const src = imageTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (!src || src.startsWith('data:')) continue;
      const url = new URL(src, canonical);
      if (url.origin !== origin) continue;
      const assetFile = decodeURIComponent(url.pathname).replace(/^\//, '');
      assert(fs.existsSync(nodePath.join(root, assetFile)), `${file} image must exist: ${assetFile}`);
    }
  }
  for (const [canonical, sources] of inbound) assert(sources.size > 0, `${canonical} needs an internal link from another sitemap page`);
});

test('homepage links to the verified PEOPLE coverage without overstating endorsement', () => {
  const homepage = read('index.html');
  assert.match(homepage, /As seen in/);
  assert.match(homepage, /Coffee from The Garden Coffee Co\. was served/);
  assert.match(homepage, /href="https:\/\/people\.com\/barbie-blank-coba-celebrates-twins-3rd-birthday-exclusive-12075794"/);
  assert.match(homepage, /rel="noopener noreferrer external"/);
  assert.doesNotMatch(homepage, /endorsed by PEOPLE/i);
});

test('performance assets are local and responsive on the homepage', () => {
  const homepage = read('index.html');
  assert.doesNotMatch(homepage, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(homepage, /href="\/css\/fonts\.css/);
  assert.match(homepage, /hero-mobile-480\.webp 480w/);
  assert.match(homepage, /facetune-wedding-480\.webp 480w/);
  assert.match(homepage, /logo-wordmark-360\.webp/);
});

test('conversion content uses factual proof and an accessible mobile CTA', () => {
  const homepage = read('index.html');
  const weddings = read('weddings/index.html');
  assert.match(homepage, /id="event-proof"/);
  assert.match(homepage, /id="home-faq-heading"/);
  assert.match(homepage, /data-home-sticky-cta/);
  assert.match(homepage, /data-cta-location="homepage-mobile-sticky"/);
  assert.doesNotMatch(homepage, /Sarah &amp; James|Jessica M\.|Amanda R\./);
  assert.doesNotMatch(weddings, /Olivia &amp; James|Jessica M\.|Amanda R\.|Chloe &amp; James/);
});

test('corporate and PEOPLE pages are substantive and internally linked', () => {
  const homepage = read('index.html');
  const journal = read('blog/index.html');
  const corporate = read('corporate-events/index.html');
  const people = read('blog/people-magazine-three-haw-birthday/index.html');
  assert.match(homepage, /href="\/corporate-events\/"/);
  assert.match(journal, /href="\/blog\/people-magazine-three-haw-birthday\/"/);
  assert.match(corporate, /"@type": "Service"/);
  assert.match(corporate, /id="quoteForm"/);
  assert.match(people, /"citation": "https:\/\/people\.com\//);
  assert.match(people, /does not claim an endorsement/i);
});
