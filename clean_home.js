const fs = require('fs');
const path = require('path');

const dir = process.cwd();
const filesToUpdate = ['beta_home.html', 'index.html'];

filesToUpdate.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');

    // 1. Remove background utility classes
    content = content.replace(/soft-gradient-bg/g, '');
    content = content.replace(/soft-blue-bg/g, '');
    content = content.replace(/soft-gray-bg/g, '');

    // 2. Fix inline styles for dark mode minimalism
    // pet owner free & pro card backgrounds
    content = content.replace(/background:\s*white;\s*padding:\s*1\.5rem;\s*border-radius:\s*12px;\s*border-left:\s*4px\s*solid.*/g,
        'background: var(--bg-card); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);"');

    // clinic card background (2rem padding)
    content = content.replace(/background:\s*white;\s*padding:\s*2rem;\s*border-radius:\s*12px;\s*border-left:\s*4px\s*solid.*/g,
        'background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card); height: 100%; display: flex; flex-direction: column; justify-content: center;"');

    // old Under construction box in index.html
    content = content.replace(/background:\s*white;\s*padding:\s*4rem\s*3rem;/g,
        'background: var(--bg-card); padding: 4rem 3rem; border: 1px solid var(--border-subtle); color: var(--primary);');

    // text colors
    content = content.replace(/color:\s*#1E293B;/g, 'color: var(--primary);');
    content = content.replace(/color:\s*#64748B;/g, 'color: var(--primary-light);');

    // 3. Specific UI tweaks for the Apple look
    content = content.replace(/<div class="hero-chip">✨ New: Track Ingredient Changes Over Time<\/div>/g,
        '<div class="hero-chip" style="color: var(--primary-light); border: 1px solid var(--border-subtle); background: var(--bg-card);">Track Ingredient Changes Over Time</div>');

    content = content.replace(/<h1 class="hero-headline">A Veterinary-Informed Ingredient Monitoring System<\/h1>/g,
        '<h1 class="hero-headline">A Minimalist Ingredient Monitoring System</h1>');

    fs.writeFileSync(path.join(dir, file), content, 'utf8');
    console.log(`Successfully updated ${file}`);
});
