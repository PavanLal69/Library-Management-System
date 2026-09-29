const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to avoid CRLF mismatch
const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// 1. Fix body font
content = content.replace(
  'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
  'font-family: Montserrat, sans-serif;'
);

// 2. Fix serif font
content = content.replace(
  'font-family: Georgia, "Times New Roman", Times, serif;',
  'font-family: "EB Garamond", Garamond, Georgia, serif;'
);

// 3. Fix mono font
content = content.replace(
  'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;',
  'font-family: "JetBrains Mono", monospace;'
);

// 4. Fix laser css
content = content.replace(
  `.barcode-laser {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 3px;`,
  `.barcode-laser {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 3px;`
);

// 5. Fix laser tween
content = content.replace(
  `tl.fromTo(
        "#scene3-laser",
        { left: "10%" },
        { left: "90%", duration: 1.4, ease: "power1.inOut", repeat: 1, yoyo: true },
        11.8
      );`,
  `tl.fromTo(
        "#scene3-laser",
        { x: 10 },
        { x: 230, duration: 1.4, ease: "power1.inOut", repeat: 1, yoyo: true },
        11.8
      );`
);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched index.html');
