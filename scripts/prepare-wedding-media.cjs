// Web-only derivatives; supplied originals are never modified.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const base = process.argv[2];
if (!base) throw new Error('Pass the ALL CONTENT directory');
const out = path.resolve(__dirname, '../assets/weddings');
fs.mkdirSync(out, { recursive: true });
const clips = [
  ['celebration', 'edited videos/693cc36be238475cbb730b2142bdad97.MOV', 0],
  ['garden-wedding', 'edited videos/05fad666eeac49ccbcfd56d14d32e23f.MOV', 4],
  ['reception-details', 'edited videos/6d81c50d74e744b79f9b17bac33ec9be.MOV', 1],
  ['hero', 'RAW CONTENT/IMG_3351.MOV', 8],
];
async function main() {
  for (const [name, source, posterTime] of clips) {
    const input = path.join(base, source);
    execFileSync('ffmpeg', ['-y', '-i', input, ...(name === 'hero' ? ['-ss', '3', '-t', '11'] : []), '-an', '-vf', 'scale=720:-2,fps=24', '-c:v', 'libx264', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, name + '.mp4')], { stdio: 'ignore' });
    execFileSync('ffmpeg', ['-y', '-ss', String(posterTime), '-i', input, '-frames:v', '1', '-vf', 'scale=960:-2', path.join(out, name + '-poster.webp')], { stdio: 'ignore' });
    console.log('Prepared', name);
  }
  for (const [name, source] of [['cart-details', 'DSCF2269.JPG'], ['wedding-moment', 'DSCF2331.JPG'], ['garden-cart', 'IMG_0046.HEIC']]) {
    let input = path.join(base, 'for web page extra', source);
    if (source.endsWith('.HEIC')) {
      input = path.join(require('node:os').tmpdir(), 'garden-wedding-source.jpg');
      execFileSync('sips', ['-s', 'format', 'jpeg', path.join(base, 'for web page extra', source), '--out', input]);
    }
    for (const width of [480, 960, 1440]) await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(out, `${name}-${width}.webp`));
    console.log('Prepared', name);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
