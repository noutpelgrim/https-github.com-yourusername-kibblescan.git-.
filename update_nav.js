const fs = require('fs');
const path = require('path');

const dir = process.cwd();

const newNav = `<div class="container nav-container">
    <nav class="navbar">
        <a href="index.html" class="logo">
            <img src="logo.svg" alt="KibbleScan Logo" class="logo-img">
            KibbleScan
        </a>
        
        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-btn" aria-label="Toggle Navigation" onclick="document.getElementById('navMenu').classList.toggle('active')">
            <ion-icon name="menu-outline"></ion-icon>
        </button>

        <div class="nav-right" id="navMenu">
            <a href="index.html" class="nav-link">Home</a>
            <a href="scan.html" class="nav-link">Scan</a>
            <a href="dashboard.html" class="nav-link">Monitoring</a>
            <a href="clinical.html" class="nav-link" style="color: #64748B; font-weight: 500;">For Clinics</a>
            <a href="access.html" class="nav-link">Pricing</a>
            <a href="protocol.html" class="nav-link">Protocol</a>
        </div>
    </nav>
</div>`;

const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let changedCount = 0;

for (const file of htmlFiles) {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');

    // Pattern 1: <div class="container nav-container">...</div> (Previous injection)
    const injectedRegex = /<div class="container nav-container">[\s\S]*?<\/nav>\s*<\/div>/gi;

    let modified = false;

    if (content.match(injectedRegex)) {
        content = content.replace(injectedRegex, newNav);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(path.join(dir, file), content, 'utf8');
        changedCount++;
        console.log(`Updated mobile nav JS in ${file}`);
    }
}

console.log(`Mobile nav JS updated in ${changedCount} files.`);
