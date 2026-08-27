const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const newContent = content.substring(0, content.length - 1);
fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent, 'utf-8');
