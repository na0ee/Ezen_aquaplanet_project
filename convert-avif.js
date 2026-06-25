const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, 'assets/images/oceanfriends');
const DEST_DIR = path.join(__dirname, 'assets/images/avif');
const QUALITY = 65;
const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`소스 폴더가 없습니다: ${SRC_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((file) => EXTS.includes(path.extname(file).toLowerCase()));

  if (files.length === 0) {
    console.log('변환할 이미지가 없습니다.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(DEST_DIR, `${path.parse(file).name}.avif`);

    try {
      await sharp(srcPath).avif({ quality: QUALITY }).toFile(destPath);
      console.log(`[성공] ${file} -> ${path.basename(destPath)}`);
      successCount++;
    } catch (err) {
      console.error(`[실패] ${file}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n변환 완료: 성공 ${successCount}건, 실패 ${failCount}건`);
}

main();
