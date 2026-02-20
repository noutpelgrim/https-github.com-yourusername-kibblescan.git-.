const fs = require('fs');
const path = require('path');

const dir = process.cwd();
const scanFile = path.join(dir, 'scan.html');

let content = fs.readFileSync(scanFile, 'utf8');

// Body background
content = content.replace(/background:\s*#F8FAFC;/g, 'background: var(--bg-page); color: var(--primary);');

// App Header
content = content.replace(/background:\s*white;\s*border-bottom:\s*1px\s*solid\s*#E2E8F0;/g,
    'background: var(--bg-card); border-bottom: 1px solid var(--border-subtle);');
content = content.replace(/color:\s*#0F172A;/g, 'color: var(--primary);');

// Text Colors
content = content.replace(/color:\s*#64748B;/g, 'color: var(--primary-light);');
content = content.replace(/color:\s*#1E293B;/g, 'color: var(--primary);');

// Camera Button
content = content.replace(/background:\s*white;\s*border:\s*2px\s*dashed\s*#CBD5E1;/g,
    'background: var(--bg-card); border: 2px dashed var(--border-subtle);');

// Minimalize the Processing state - remove heavy CLI animations
content = content.replace(/<div class="scan-container">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g,
    `<div style="margin: 3rem 0; color: var(--primary-light); font-size: 0.95rem; font-weight: 500;">
        <span class="status-dot"></span> Analyzing label structure...
    </div>`);

content = content.replace(/<div id="cli-output"[\s\S]*?<\/div>/g, '');

// Result Header
content = content.replace(/background:\s*white;\s*border-radius:\s*16px;\s*padding:\s*20px;\s*box-shadow:\s*0\s*4px\s*6px\s*-1px\s*rgba\(0,0,0,0\.05\);/g,
    'background: var(--bg-card); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-card); border: 1px solid var(--border-subtle);');

// Result Findings wrapper
content = content.replace(/background:\s*white;\s*border-radius:\s*12px;\s*overflow:\s*hidden;\s*border:\s*1px\s*solid\s*#E2E8F0;/g,
    'background: var(--bg-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);');

fs.writeFileSync(scanFile, content, 'utf8');
console.log(`Successfully updated scan.html`);
