const fs = require('fs');
const filePath = 'src/pages/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the state definition
content = content.replace(
  /const \[visitorData, setVisitorData\] = useState<\w*.*?>\(\{ admins: \[\], unregistered: \[\], registered: \[\] \}\);/,
  `const [visitorData, setVisitorData] = useState<{admins: string[], unregistered: string[], registered: {email: string, visited: boolean, last_visited_at?: string}[]}>({ admins: [], unregistered: [], registered: [] });\n  const [registeredFilter, setRegisteredFilter] = useState<'all' | 'visited' | 'not-visited'>('all');`
);

// 2. Update the fetch logic to pass last_visited_at
content = content.replace(
  /const visitedEmails = new Set\(\(visits \|\| \[\]\)\.map\(v => v\.email\)\);/,
  `const visitsMap = new Map((visits || []).map(v => [v.email, v.last_visited_at]));`
);

content = content.replace(
  /const registeredList = registeredEmails\.map\(email => \(\{\s*email,\s*visited: visitedEmails\.has\(email\)\s*\}\)\);/,
  `const registeredList = registeredEmails.map(email => ({
        email,
        visited: visitsMap.has(email),
        last_visited_at: visitsMap.get(email)
      }));`
);

// 3. Find the section for Registered Users and replace it
const startTarget = '<div>\n                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Registered Users';
const endTarget = '</div>\n                </div>';
const startIndex = content.indexOf(startTarget);
// Find the closing div of this section
// It's the 3rd <div> section inside the modal body.
// Instead of complex parsing, let's use a simpler replace strategy by targeting a known block.

const registeredUIReplacement = `<div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Registered Users ({visitorData.registered.length})</h3>
                    <select 
                      className="bg-black/30 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:border-white/30"
                      value={registeredFilter}
                      onChange={(e) => setRegisteredFilter(e.target.value as 'all' | 'visited' | 'not-visited')}
                    >
                      <option value="all" className="bg-gray-900">All</option>
                      <option value="visited" className="bg-gray-900">Visited</option>
                      <option value="not-visited" className="bg-gray-900">Not Visited</option>
                    </select>
                  </div>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
                     {visitorData.registered.filter(u => registeredFilter === 'all' ? true : registeredFilter === 'visited' ? u.visited : !u.visited).length === 0 && <span className="text-sm text-gray-400 px-2">No users found for this filter.</span>}
                    {visitorData.registered
                      .filter(user => registeredFilter === 'all' ? true : registeredFilter === 'visited' ? user.visited : !user.visited)
                      .map(user => (
                      <div 
                        key={user.email} 
                        className="flex flex-col sm:flex-row justify-between sm:items-center text-sm px-2 py-2 border-b border-white/10 last:border-0 cursor-pointer hover:bg-white/10 transition-colors gap-2"
                        onClick={() => handleVisitorClick(user.email)}
                      >
                        <span className="text-white">{user.email}</span>
                        <div className="flex items-center gap-3">
                          {user.visited && user.last_visited_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(user.last_visited_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {user.visited ? (
                             <span className="px-2.5 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full border border-green-900/50 whitespace-nowrap">Visited</span>
                          ) : (
                             <span className="px-2.5 py-1 bg-black/40 text-gray-400 text-xs font-semibold rounded-full border border-white/10 whitespace-nowrap">Not Visited</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>`;

const regex = /<div>\s*<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Registered Users[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;
content = content.replace(regex, registeredUIReplacement + '\n              </div>\n            )}');

fs.writeFileSync(filePath, content);
console.log('done');
