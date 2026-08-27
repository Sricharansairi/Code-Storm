const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
const lines = content.split('\n');

let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for(let j=0; j<line.length; j++) {
     if(line[j] === '{') count++;
     if(line[j] === '}') count--;
  }
  if (count < 0) {
      console.log('Negative at line', i + 1);
      break;
  }
}
console.log('Final count:', count);
