const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const theme = process.argv[2];

if (theme !== 'light' && theme !== 'dark') {
  console.error("Usage: node switch_theme.cjs [light|dark]");
  process.exit(1);
}

console.log(`Switching to ${theme} theme...`);

const srcDir = path.join(__dirname, 'src');
const backupDir = path.join(__dirname, `src_${theme}_backup`);

if (!fs.existsSync(backupDir)) {
  console.error(`Error: Backup directory ${backupDir} not found.`);
  process.exit(1);
}

try {
  // We don't delete src, we just overwrite it using shell commands for safety
  // Since we are on Windows, we use Copy-Item or xcopy
  if (process.platform === 'win32') {
    // Delete existing src completely to ensure clean copy
    fs.rmSync(srcDir, { recursive: true, force: true });
    // Copy from backup
    execSync(`xcopy /E /I /Q /Y "${backupDir}" "${srcDir}"`);
  } else {
    fs.rmSync(srcDir, { recursive: true, force: true });
    execSync(`cp -r "${backupDir}" "${srcDir}"`);
  }
  
  console.log(`Successfully switched to ${theme} theme!`);
  console.log('You may need to restart your development server (npm run dev) to see all changes.');
} catch (error) {
  console.error("Error switching themes:", error.message);
}
