const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Mass replacements to undo dark mode
    content = content.replace(/bg-white\/5/g, 'bg-white');
    content = content.replace(/border-white\/10/g, 'border-gray-100');
    content = content.replace(/border-white\/5/g, 'border-gray-50');
    content = content.replace(/bg-black\/60/g, 'bg-gray-900/40');
    
    content = content.replace(/text-white/g, 'text-gray-900');
    content = content.replace(/text-gray-300/g, 'text-gray-700');
    content = content.replace(/text-gray-400/g, 'text-gray-500');
    
    // Specifically fix cases where text-white was on buttons which SHOULD be text-white
    content = content.replace(/btn-primary(.*?)text-gray-900/g, 'btn-primary$1text-white');
    content = content.replace(/bg-blue-600(.*?)text-gray-900/g, 'bg-blue-600$1text-white');
    
    // Remove z-index and glass nav overrides
    content = content.replace(/ relative z-\[.*?\]/g, '');
    content = content.replace(/glass-nav/g, 'bg-white border-b border-gray-100');
    content = content.replace(/glass-input/g, 'w-full text-sm py-2 px-3 border border-gray-200 rounded-lg');
    content = content.replace(/glass-bottom-bar/g, 'bg-white border-t border-gray-100');
    
    fs.writeFileSync(file, content, 'utf8');
});

console.log('Reverted TSX files.');
