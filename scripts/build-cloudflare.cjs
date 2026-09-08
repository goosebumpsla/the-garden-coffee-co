// Publish only tracked website assets, never raw media, credentials or finance files.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist-cloudflare');
const roots = new Set(['index.html', 'robots.txt', 'sitemap.xml']);
const dirs = /^(assets|images|css|js|weddings|gallery|blog|privacy)\//;
const extensions = /\.(html|css|js|png|jpe?g|webp|svg|ico|mp4|webm|woff2?)$/i;
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(file => roots.has(file) || (dirs.test(file) && extensions.test(file)));
if (!files.includes('index.html')) throw Error('Website entry point missing');
fs.rmSync(out, { recursive: true, force: true }); // Exact generated output directory only.
fs.mkdirSync(out, { recursive: true });
let bytes = 0;
for (const file of files) {
  const source = path.join(root, file);
  const info = fs.lstatSync(source);
  if (!info.isFile() || info.isSymbolicLink()) throw Error('Unexpected asset: ' + file);
  if (info.size > 25 * 1024 * 1024) throw Error('Asset exceeds Cloudflare limit: ' + file);
  const destination = path.join(out, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  bytes += info.size;
}
fs.copyFileSync(path.join(root, 'cloudflare/_headers'), path.join(out, '_headers'));
fs.copyFileSync(path.join(root, 'cloudflare/_redirects'), path.join(out, '_redirects'));
fs.copyFileSync(path.join(root, 'cloudflare/404.html'), path.join(out, '404.html'));
console.log(`Built ${files.length} public assets (${(bytes / 1024 / 1024).toFixed(1)} MiB). Private files excluded.`);
