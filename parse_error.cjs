const ts = require('typescript');
const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const sourceFile = ts.createSourceFile('AdminDashboard.tsx', content, ts.ScriptTarget.Latest, true);

if (sourceFile.parseDiagnostics && sourceFile.parseDiagnostics.length > 0) {
    sourceFile.parseDiagnostics.forEach(d => {
        const pos = sourceFile.getLineAndCharacterOfPosition(d.start);
        console.log('Error at line ' + (pos.line + 1) + ': ' + d.messageText);
    });
}
