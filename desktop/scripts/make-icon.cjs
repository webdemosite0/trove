const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "build", "icon.png");
fs.mkdirSync(path.dirname(out), { recursive: true });

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="220" fill="#0b0b0c"/>
  <rect x="86" y="88" width="852" height="848" rx="218" fill="#0b0b0c" stroke="#3b82f6" stroke-width="38"/>
  <rect x="302" y="348" width="420" height="86" rx="30" fill="#f7f8fa"/>
  <rect x="456" y="410" width="112" height="316" rx="30" fill="#f7f8fa"/>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .resize(1024, 1024)
  .toFile(out)
  .then(() => console.log("Trove desktop icon:", out))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
