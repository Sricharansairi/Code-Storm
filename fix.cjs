const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const startIdx = content.indexOf('const fetchTeams = async () => {');
const returnIdx = content.indexOf('return (', startIdx);
const mainIdx = content.indexOf('<main className="max-w-7xl mx-auto px-4 py-8 overflow-hidden">');
const dashboardIdx = content.indexOf("{activeTab === 'dashboard' && (");
const settingsIdx = content.indexOf("{activeTab === 'settings' && (");

console.log('startIdx', startIdx);
console.log('returnIdx', returnIdx);
console.log('mainIdx', mainIdx);
console.log('dashboardIdx', dashboardIdx);
console.log('settingsIdx', settingsIdx);

