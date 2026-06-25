const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, 'Oceanfriends.html');
const AVIF_DIR = path.join(__dirname, 'assets/images/avif');

const avifFiles = new Set(fs.readdirSync(AVIF_DIR));

let html = fs.readFileSync(HTML_PATH, 'utf8');

const imgTagRegex = /([ \t]*)<img src="assets\/images\/oceanfriends\/([^"]+)"([^>]*)>/g;

let wrapped = 0;
let skipped = [];

html = html.replace(imgTagRegex, (match, indent, filename, rest) => {
  const avifName = `${path.parse(filename).name}.avif`;

  if (!avifFiles.has(avifName)) {
    skipped.push(filename);
    return match;
  }

  wrapped++;
  return (
    `${indent}<picture>\n` +
    `${indent}  <source srcset="assets/images/avif/${avifName}" type="image/avif">\n` +
    `${indent}  <img src="assets/images/oceanfriends/${filename}"${rest}>\n` +
    `${indent}</picture>`
  );
});

fs.writeFileSync(HTML_PATH, html, 'utf8');

console.log(`<picture> 적용 완료: ${wrapped}건`);
if (skipped.length > 0) {
  console.log(`\nAVIF 매칭 실패로 건너뜀 (${skipped.length}건):`);
  [...new Set(skipped)].forEach((f) => console.log(`  - ${f}`));
}
