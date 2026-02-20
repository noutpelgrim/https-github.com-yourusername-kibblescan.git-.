const fs = require('fs');
const path = require('path');

const dir = process.cwd();
const filesToUpdate = ['access.html', 'clinical.html', 'registry.html'];

filesToUpdate.forEach(file => {
    let filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Body backgrounds (match variations)
    content = content.replace(/background:\s*#F8FAFC;/g, 'background: var(--bg-page); color: var(--primary);');
    content = content.replace(/background-color:\s*#F8FAFC;/g, 'background-color: var(--bg-page); color: var(--primary);');

    // Pricing page cards (access.html) - Free tier
    content = content.replace(/background:\s*white;\s*padding:\s*2rem;\s*border-top:\s*4px\s*solid\s*#10B981;/g,
        'background: var(--bg-card); padding: 2.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);');

    // Pricing page cards (access.html) - Clinical tier
    content = content.replace(/background:\s*white;\s*padding:\s*2rem;\s*border-top:\s*4px\s*solid\s*#3B82F6;/g,
        'background: var(--bg-card); padding: 2.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);');

    // Clinical Dashboard cards (clinical.html, registry.html)
    // .clinical-card background
    content = content.replace(/background:\s*white;\s*border-radius:\s*8px;\s*\/\*\s*Sharper,\s*more\s*professional\s*corners\s*\*\/\s*padding:\s*2\.5rem;\s*box-shadow:\s*0\s*4px\s*6px\s*-1px\s*rgba\(0,\s*0,\s*0,\s*0\.05\);\s*border:\s*1px\s*solid\s*#E2E8F0;/g,
        'background: var(--bg-card); border-radius: var(--radius-lg); padding: 3rem; box-shadow: var(--shadow-card); border: 1px solid var(--border-subtle);');

    // inline primary/white text colors
    content = content.replace(/color:\s*#1E1B4B;/gi, 'color: var(--primary);');
    content = content.replace(/color:\s*#0F172A;/gi, 'color: var(--primary);');
    content = content.replace(/color:\s*#334155;/gi, 'color: var(--primary-light);');
    content = content.replace(/color:\s*#64748B;/gi, 'color: var(--primary-light);');
    content = content.replace(/color:\s*#94A3B8;/gi, 'color: var(--primary-light);');
    content = content.replace(/border-color:\s*#E2E8F0;/gi, 'border-color: var(--border-subtle);');
    content = content.replace(/border-bottom:\s*2px\s*solid\s*#E2E8F0;/gi, 'border-bottom: 1px solid var(--border-subtle);');

    // Remove excessive icons styling inline
    content = content.replace(/font-size:\s*1\.2rem;\s*color:\s*#[a-fA-F0-9]{6};/g, 'font-size: 1.2rem; color: var(--primary-light);');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${file}`);
});
