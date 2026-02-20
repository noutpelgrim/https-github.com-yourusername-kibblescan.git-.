const fs = require('fs');

const cssAddition = `
.logo { display: flex; align-items: center; gap: 8px; }
.logo-img { height: 28px; width: auto; vertical-align: middle; }
`;
fs.appendFileSync('style.css', cssAddition);

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/class="logo">KibbleScan<\/a>/g, 'class="logo"><img src="logo.svg" alt="KibbleScan Logo" class="logo-img"> KibbleScan</a>');
    content = content.replace(/class="logo">KibbleScan<\/div>/g, 'class="logo"><img src="logo.svg" alt="KibbleScan Logo" class="logo-img"> KibbleScan</div>');
    if (content !== original) {
        fs.writeFileSync(file, content);
        count++;
    }
});
console.log(`Successfully updated ${count} HTML files.`);
