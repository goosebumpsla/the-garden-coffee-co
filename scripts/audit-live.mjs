import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = new URL(process.argv[2] || 'https://thegardencoffeecart.com');
const expectNoindex = process.argv.includes('--expect-noindex');
const canonicalOrigin = 'https://thegardencoffeecart.com';
const cacheBuster = `audit-${Date.now()}`;
const read = relative => readFile(join(projectRoot, relative), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonicalToFile = canonical => {
  const pathname = new URL(canonical).pathname;
  return pathname === '/' ? 'index.html' : `${pathname.slice(1)}index.html`;
};
const fetchPath = async pathname => {
  const target = new URL(pathname, baseUrl);
  target.searchParams.set('_garden_audit', cacheBuster);
  return fetch(target, { redirect: 'manual', headers: { 'User-Agent': 'GardenCoffeeDeploymentAudit/1.0' } });
};
const headerExpectation = response => {
  const value = response.headers.get('x-robots-tag');
  if (expectNoindex) assert.match(value || '', /\bnoindex\b/i, `${response.url} preview must be noindex`);
  else assert(!value || !/\bnoindex\b/i.test(value), `${response.url} production must be indexable`);
};

const sitemapSource = await read('sitemap.xml');
const canonicals = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(canonicals.length, 7, 'Expected seven sitemap URLs');

for (const canonical of canonicals) {
  assert(canonical.startsWith(`${canonicalOrigin}/`), `Unexpected canonical origin: ${canonical}`);
  const pathname = new URL(canonical).pathname;
  const localHtml = await read(canonicalToFile(canonical));
  const response = await fetchPath(pathname);
  const remoteHtml = await response.text();
  assert.equal(response.status, 200, `${pathname} status`);
  assert.match(response.headers.get('content-type') || '', /^text\/html\b/i, `${pathname} content type`);
  headerExpectation(response);
  assert.equal(sha256(remoteHtml), sha256(localHtml), `${pathname} does not match the committed HTML`);
  assert.equal(remoteHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1], canonical, `${pathname} canonical`);
  assert.equal((remoteHtml.match(/<h1\b/gi) || []).length, 1, `${pathname} H1 count`);
  assert.doesNotMatch(remoteHtml, /<meta[^>]+(?:name|property)=["']robots["'][^>]+noindex/i, `${pathname} meta robots`);
  for (const [, schema] of remoteHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) JSON.parse(schema);
  console.log(`200  ${pathname}  exact source match`);
}

for (const resource of ['/robots.txt', '/sitemap.xml']) {
  const response = await fetchPath(resource);
  assert.equal(response.status, 200, `${resource} status`);
  headerExpectation(response);
  console.log(`200  ${resource}`);
}

for (const privatePath of ['/definitely-not-a-page/', '/.git/config', '/CLOUDFLARE_MIGRATION.md', '/package.json']) {
  const response = await fetchPath(privatePath);
  assert.equal(response.status, 404, `${privatePath} must return 404`);
  headerExpectation(response);
  console.log(`404  ${privatePath}`);
}

if (!expectNoindex) {
  const redirectCases = [
    [
      'http://thegardencoffeecart.com/gallery/?source=audit',
      'https://thegardencoffeecart.com/gallery/?source=audit',
    ],
    [
      'https://www.thegardencoffeecart.com/blog/?source=audit',
      'https://thegardencoffeecart.com/blog/?source=audit',
    ],
  ];

  for (const [source, destination] of redirectCases) {
    const response = await fetch(source, {
      redirect: 'manual',
      headers: { 'User-Agent': 'GardenCoffeeDeploymentAudit/1.0' },
    });
    assert.equal(response.status, 301, `${source} must permanently redirect`);
    assert.equal(response.headers.get('location'), destination, `${source} redirect destination`);
    console.log(`301  ${source}  ->  ${destination}`);
  }
}

console.log(`Audit passed for ${baseUrl.origin}${expectNoindex ? ' (protected preview)' : ' (indexable production)'}.`);
