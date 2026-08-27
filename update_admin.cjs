const fs = require('fs');
const filePath = 'src/pages/AdminDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add states
const statesInsert = `  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [visitorData, setVisitorData] = useState<{admins: string[], unregistered: string[], registered: {email: string, visited: boolean}[]}>({ admins: [], unregistered: [], registered: [] });
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [visitorTeamDetails, setVisitorTeamDetails] = useState<any>(null);
  const [revokeAdminEmail, setRevokeAdminEmail] = useState<string | null>(null);
  const [revokePasscode, setRevokePasscode] = useState('');
  const [revokeError, setRevokeError] = useState('');`;
  
content = content.replace(/  const \[visitorModalOpen, setVisitorModalOpen\] = useState\(false\);\s*const \[visitorData, setVisitorData\].*?\s*const \[loadingVisitors, setLoadingVisitors\] = useState\(false\);/, statesInsert);

// 2. Add handlers
const handlersInsert = `
  const handleVisitorClick = (email: string) => {
    const team = teams.find(t => t.tl_email === email || (t.members && t.members.includes(email)));
    setVisitorTeamDetails(team || 'none');
  };

  const handleRevokeAdmin = async () => {
    if (revokePasscode !== 'INDUS') {
      setRevokeError('Invalid passcode');
      return;
    }
    try {
      await supabase.from('admins').delete().eq('email', revokeAdminEmail);
      setRevokeAdminEmail(null);
      setRevokePasscode('');
      setRevokeError('');
      fetchVisitors();
    } catch (err) {
      console.error(err);
      setRevokeError('Failed to revoke admin');
    }
  };
`;
content = content.replace(/  const fetchTeams = async \(\) => {/, handlersInsert + '\n  const fetchTeams = async () => {');

// 3. Update admins list
content = content.replace(
  /\{visitorData\.admins\.map\(email => \(\s*<div key=\{email\} className="text-sm text-white font-medium px-2 py-1">\{email\}<\/div>\s*\)\)\}/g,
  `{visitorData.admins.map(email => (
                      <div key={email} className="flex justify-between items-center text-sm text-white font-medium px-2 py-1 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                        <span>{email}</span>
                        {email !== session.user.email && (
                          <button 
                            onClick={() => setRevokeAdminEmail(email)} 
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/30 rounded border border-red-900/50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}`
);

// Update unregistered list
content = content.replace(
  /\{visitorData\.unregistered\.map\(email => \(\s*<div key=\{email\} className="text-sm text-white px-2 py-1">\{email\}<\/div>\s*\)\)\}/g,
  `{visitorData.unregistered.map(email => (
                      <div 
                        key={email} 
                        className="text-sm text-white px-2 py-1.5 cursor-pointer hover:bg-white/10 rounded transition-colors"
                        onClick={() => handleVisitorClick(email)}
                      >
                        {email}
                      </div>
                    ))}`
);

// Update registered list
content = content.replace(
  /\{visitorData\.registered\.map\(user => \(\s*<div key=\{user\.email\} className="flex justify-between items-center text-sm px-2 py-1\.5 border-b border-white\/10 last:border-0">\s*<span className="text-white">\{user\.email\}<\/span>\s*\{user\.visited \? \(\s*<span className="px-2\.5 py-1 bg-green-900\/30 text-green-400 text-xs font-semibold rounded-full border border-green-900\/50">Visited<\/span>\s*\) : \(\s*<span className="px-2\.5 py-1 bg-black\/40 text-gray-400 text-xs font-semibold rounded-full border border-white\/10">Not Visited<\/span>\s*\)\}\s*<\/div>\s*\)\)\}/g,
  `{visitorData.registered.map(user => (
                      <div 
                        key={user.email} 
                        className="flex justify-between items-center text-sm px-2 py-1.5 border-b border-white/10 last:border-0 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => handleVisitorClick(user.email)}
                      >
                        <span className="text-white">{user.email}</span>
                        {user.visited ? (
                           <span className="px-2.5 py-1 bg-green-900/30 text-green-400 text-xs font-semibold rounded-full border border-green-900/50">Visited</span>
                        ) : (
                           <span className="px-2.5 py-1 bg-black/40 text-gray-400 text-xs font-semibold rounded-full border border-white/10">Not Visited</span>
                        )}
                      </div>
                    ))}`
);

// 4. Add sub-modals
const subModals = `
            {/* Team Details Sub-Modal */}
            {visitorTeamDetails && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 p-6 flex flex-col rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Team Details</h3>
                  <button onClick={() => setVisitorTeamDetails(null)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                {visitorTeamDetails === 'none' ? (
                  <p className="text-gray-400 text-center mt-10">This user is not part of any registered team.</p>
                ) : (
                  <div className="space-y-4 overflow-y-auto">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Team Name</p>
                      <p className="text-white font-medium">{visitorTeamDetails.team_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Team Leader</p>
                      <p className="text-white">{visitorTeamDetails.tl_name} ({visitorTeamDetails.tl_email})</p>
                      <p className="text-gray-300 text-sm">{visitorTeamDetails.tl_department} - {visitorTeamDetails.tl_year} | {visitorTeamDetails.tl_mobile}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Members</p>
                      <ul className="list-disc list-inside text-gray-300 text-sm">
                        {(visitorTeamDetails.members || []).map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Allocated PS</p>
                      <p className="text-white">{visitorTeamDetails.allocated_ps_id || 'None'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Revoke Admin Prompt */}
            {revokeAdminEmail && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 p-6 flex flex-col items-center justify-center rounded-2xl">
                <div className="bg-black/40 border border-red-500/30 p-6 rounded-xl w-full max-w-sm">
                  <h3 className="text-lg font-bold text-white mb-2">Revoke Admin</h3>
                  <p className="text-gray-400 text-sm mb-4">Are you sure you want to revoke admin access for <strong className="text-white">{revokeAdminEmail}</strong>?</p>
                  
                  <input
                    type="password"
                    placeholder="Enter Passcode"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white mb-2 outline-none focus:border-red-500/50"
                    value={revokePasscode}
                    onChange={(e) => setRevokePasscode(e.target.value)}
                  />
                  {revokeError && <p className="text-red-400 text-xs mb-4">{revokeError}</p>}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      onClick={() => { setRevokeAdminEmail(null); setRevokeError(''); setRevokePasscode(''); }} 
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleRevokeAdmin} 
                      className="px-4 py-2 text-sm bg-red-900/50 text-red-100 hover:bg-red-900/80 rounded-lg border border-red-500/30 transition-colors"
                    >
                      Confirm Revoke
                    </button>
                  </div>
                </div>
              </div>
            )}
`;

content = content.replace(/          <\/motion\.div>/, subModals + '\n          </motion.div>');

fs.writeFileSync(filePath, content);
console.log('Done');
