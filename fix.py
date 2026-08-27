import sys

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = """                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Admins ({visitorData.admins.length})</h3>
                  <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
                    {visitorData.admins.map(email => (
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
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Unknown Visitors ({visitorData.unregistered.length})</h3>
                  {visitorData.unregistered.length === 0 ? (
                    <span className="text-sm text-gray-400 px-2">No unknown visitors.</span>
                  ) : (
                    <select
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
                      onChange={(e) => {
                        if (e.target.value) handleVisitorClick(e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select an email to view details...</option>
                      {visitorData.unregistered.map(email => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Known Visitors (Team Leaders) ({visitorData.registered.length})</h3>
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
                  <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
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
"""

new_lines_list = [line + '\\n' for line in new_lines.strip('\\n').split('\\n')]
lines[1022:1039] = new_lines_list

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
