const fs = require('fs');
const path = require('path');
const os = require('os');

const sourceDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain', '85c83a9d-0632-461c-bdac-00c891d700a5');
const sourceFile = path.join(sourceDir, 'venola_bg_premium_1776470675612.png');
const destDir = path.join(__dirname, '..', 'public', 'images');
const destFile = path.join(destDir, 'venola-bg.png');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(sourceFile, destFile);
console.log('Image copied successfully!');
