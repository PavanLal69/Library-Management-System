import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Fix .badge-academic .star color for contrast (from #d97706 to #92400e)
content = content.replace(
  /\.badge-academic \.star\s*\{\s*color:\s*#d97706;/g,
  '.badge-academic .star {\n        color: #92400e;'
);

// 2. Fix .search-btn background for contrast (from #d97706 to #92400e)
content = content.replace(
  /\.search-btn\s*\{([^}]+)background:\s*#d97706;/g,
  '.search-btn {$1background: #92400e;'
);

// 3. Fix star ratings color in Scene 2 (from #d97706 to #92400e)
content = content.replace(
  /<span style="color:\s*#d97706;\s*font-size:\s*22px;">★★★★★<\/span>/g,
  '<span style="color: #92400e; font-size: 22px;">★★★★★</span>'
);

// 4. Fix #b45309 text colors to #92400e for WCAG AA compliance (4.48:1 -> >6:1)
content = content.replace(/#b45309/g, '#92400e');

// 5. Fix unclosed <h2> tag in Scene 2
content = content.replace(
  /<h2 class="font-serif" style="font-size: 42px; font-weight: 700; line-height: 1.15; color: #1c1917;">\s*Designing Data-Intensive Applications\s*<\/div>/g,
  `<h2 class="font-serif" style="font-size: 42px; font-weight: 700; line-height: 1.15; color: #1c1917;">
                  Designing Data-Intensive Applications
                </h2>`
);

// 6. Fix spotlight card width and padding to prevent text_box_overflow
content = content.replace(
  /\.spotlight-card\s*\{\s*width:\s*1100px;\s*background:\s*#ffffff;\s*border:\s*1px solid #e7e5e4;\s*border-radius:\s*28px;\s*padding:\s*48px;\s*display:\s*flex;\s*gap:\s*56px;/g,
  `.spotlight-card {
        width: 1240px;
        background: #ffffff;
        border: 1px solid #e7e5e4;
        border-radius: 28px;
        padding: 44px;
        display: flex;
        gap: 44px;`
);

// 7. Fix .spotlight-actions to allow clean flex alignment and layout
content = content.replace(
  /\.spotlight-actions\s*\{\s*display:\s*flex;\s*align-items:\s*center;\s*gap:\s*16px;\s*margin-top:\s*12px;\s*\}/g,
  `.spotlight-actions {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 12px;
      }`
);

// 8. Add data-layout-allow-overflow to #scene2-cover and its inner svg wrapper
content = content.replace(
  /<div id="scene2-cover" class="book-cover">/g,
  '<div id="scene2-cover" class="book-cover" data-layout-allow-overflow>'
);
content = content.replace(
  /<div style="align-self: center; margin: 16px 0; opacity: 0.85;">/g,
  '<div style="align-self: center; margin: 16px 0; opacity: 0.85;" data-layout-allow-overflow>'
);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated composition for layout and contrast compliance');
