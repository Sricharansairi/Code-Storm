const ts = require('typescript');
const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('AdminDashboard.tsx', content, ts.ScriptTarget.Latest, true);
console.log('Source file parsed.');
