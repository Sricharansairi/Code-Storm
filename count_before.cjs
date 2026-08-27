const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const lines = content.split('\n');

let count = 0;
for (let i = 0; i < 415; i++) {
  const line = lines[i];
  for(let j=0; j<line.length; j++) {
     if(line[j] === '{') count++;
     if(line[j] === '}') count--;
  }
}
console.log('Count before line 416:', count);
