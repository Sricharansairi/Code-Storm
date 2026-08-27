const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const stack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') {
    stack.push({ char: '{', index: i });
  } else if (content[i] === '}') {
    if (stack.length > 0 && stack[stack.length - 1].char === '{') {
      stack.pop();
    } else {
      stack.push({ char: '}', index: i });
    }
  }
}

console.log('Unmatched braces:');
stack.forEach(b => {
  // Find line number
  const lineNo = content.substring(0, b.index).split('\n').length;
  console.log(b.char, 'at line', lineNo);
});
