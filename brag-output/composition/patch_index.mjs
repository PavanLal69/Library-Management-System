import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for consistent replacement
const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Replace all font-family stacks
content = content.replace(
  /font-family:\s*-apple-system,[^;]+;/g,
  'font-family: Montserrat, sans-serif;'
);
content = content.replace(
  /font-family:\s*Georgia,[^;]+;/g,
  'font-family: "EB Garamond", Garamond, Georgia, serif;'
);
content = content.replace(
  /font-family:\s*ui-monospace,[^;]+;/g,
  'font-family: "JetBrains Mono", monospace;'
);
content = content.replace(/SFMono-Regular/gi, 'JetBrains Mono');

// 2. Fix laser positioning CSS
content = content.replace(
  /\.barcode-laser\s*\{([^}]+)\}/,
  (match, p1) => {
    let updated = p1;
    if (!updated.includes('left:')) {
      updated = ' left: 0;\n' + updated;
    }
    return `.barcode-laser {${updated}}`;
  }
);

// 3. Fix laser tween in GSAP timeline
content = content.replace(
  /tl\.fromTo\(\s*["']#scene3-laser["'],\s*\{\s*left:\s*["'][^"']+["']\s*\},\s*\{\s*left:\s*["'][^"']+["'],\s*duration:\s*1\.4,\s*ease:\s*["']power1\.inOut["'],\s*repeat:\s*1,\s*yoyo:\s*true\s*\},\s*11\.8\s*\);/,
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
console.log('Successfully patched index.html via patch_index.mjs');
