const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const lines = content.split('\n');

let count = 0;
for (let i = 12; i < 415; i++) {
  const line = lines[i];
  const old = count;
  for(let j=0; j<line.length; j++) {
     if(line[j] === '{') count++;
     if(line[j] === '}') count--;
  }
  if (count !== old && count > 1) {
      console.log('Line ' + (i+1) + ': count = ' + count + ' ' + line.trim());
  }
}
