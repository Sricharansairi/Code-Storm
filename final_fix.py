import sys
import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Nav tabs text-primary
content = content.replace("bg-white/10 text-primary shadow-sm border border-white/10", "bg-white/10 text-white shadow-sm border border-white/10")

# 2. Add Delete Marks option in Evaluate modal
eval_buttons_old = """              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>"""

eval_buttons_new = """              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                {evaluations.find(e => e.team_id === teamToEvaluate.id) && (
                  <button type="button" onClick={() => handleDeleteMarks(teamToEvaluate.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-6 rounded-lg transition-all duration-300 text-sm">Delete Marks</button>
                )}
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>"""
content = content.replace(eval_buttons_old, eval_buttons_new)

# 3. Add Revoke Admin state and UI
visitor_states_search = "  const [visitorModalOpen, setVisitorModalOpen] = useState(false);"
visitor_states_replace = "  const [visitorModalOpen, setVisitorModalOpen] = useState(false);\n  const [revokeAdminEmail, setRevokeAdminEmail] = useState<string | null>(null);"
content = content.replace(visitor_states_search, visitor_states_replace)

handle_revoke_func = """  const handleRevokeAdmin = async () => {
    if (!revokeAdminEmail) return;
    const passcode = prompt("Enter Master Passcode to revoke admin access:");
    if (passcode !== "INDUS") {
      alert("Invalid passcode.");
      return;
    }
    const { error } = await supabase.from('admins').delete().eq('email', revokeAdminEmail);
    if (error) {
      alert("Error revoking admin: " + error.message);
    } else {
      alert(`Admin access revoked for ${revokeAdminEmail}`);
      setRevokeAdminEmail(null);
      fetchVisitorData();
    }
  };"""

content = content.replace("  const fetchVisitorData = async () => {", handle_revoke_func + "\n\n  const fetchVisitorData = async () => {")

admins_ui_old = """                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Admins ({visitorData.admins.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    {visitorData.admins.map(email => (
                      <div key={email} className="text-sm text-white font-medium px-2 py-1">{email}</div>
                    ))}
                  </div>"""

admins_ui_new = """                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Admins ({visitorData.admins.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    {visitorData.admins.map(email => (
                      <div key={email} className="flex justify-between items-center text-sm text-white font-medium px-2 py-1 border-b border-white/10 last:border-0 hover:bg-white/10 transition-colors">
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
                  </div>"""
content = content.replace(admins_ui_old, admins_ui_new)

revoke_modal = """      {/* Revoke Admin Confirmation */}
      {revokeAdminEmail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2">Revoke Admin Access?</h3>
            <p className="text-gray-300 text-sm mb-6">Are you sure you want to revoke admin privileges for <strong>{revokeAdminEmail}</strong>?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRevokeAdminEmail(null)} className="btn-secondary text-sm px-6">Cancel</button>
              <button onClick={handleRevokeAdmin} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-6 rounded-lg transition-all duration-300 text-sm">Revoke Access</button>
            </div>
          </motion.div>
        </div>
      )}
"""
content = content.replace("{/* Visitor Modal */}", revoke_modal + "\n      {/* Visitor Modal */}")

# 4. Room Coordinators manually adding rooms
room_iter_old = """                  {/* Derive rooms based on PS assigned to this day */}
                  {Array.from(new Set(
                    problemStatements
                      .filter(ps => ps.presentation_day === logisticsDay && ps.room_number)
                      .map(ps => ps.room_number)
                  )).map(room => {"""
room_iter_new = """                  {/* Derive rooms based on PS assigned to this day OR manually added coordinators */}
                  {Array.from(new Set([
                    ...problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number).map(ps => ps.room_number),
                    ...coordinators.filter(c => c.presentation_day === logisticsDay && c.room_number).map(c => c.room_number)
                  ])).map(room => {"""
content = content.replace(room_iter_old, room_iter_new)

add_room_old = """                      <select value={logisticsDay} onChange={e => setLogisticsDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-2 px-3 focus:ring-primary focus:border-primary">
                        <option value="31st August">Day 1: 31st August</option>
                        <option value="1st September">Day 2: 1st September</option>
                        <option value="2nd September">Day 3: 2nd September</option>
                      </select>
                  </div>
                </div>

                <div className="space-y-4">"""

add_room_new = """                      <select value={logisticsDay} onChange={e => setLogisticsDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-2 px-3 focus:ring-white/50 focus:border-white/50 text-white">
                        <option value="31st August">Day 1: 31st August</option>
                        <option value="1st September">Day 2: 1st September</option>
                        <option value="2nd September">Day 3: 2nd September</option>
                      </select>
                  </div>
                </div>

                <div className="mb-4">
                  <button onClick={() => {
                    const r = prompt("Enter new Room Number for " + logisticsDay + ":");
                    if (r) {
                      supabase.from('room_coordinators').upsert({ presentation_day: logisticsDay, room_number: r }, {onConflict: 'presentation_day,room_number'}).then(() => fetchCoordinators());
                    }
                  }} className="btn-secondary text-sm flex items-center gap-2">
                    <Plus size={16} /> Add Room Manually
                  </button>
                </div>

                <div className="space-y-4">"""
content = content.replace(add_room_old, add_room_new)

# Any remaining purple things? text-primary?
content = content.replace('text-2xl font-black text-primary', 'text-2xl font-black text-white')
content = content.replace('text-lg font-bold text-primary', 'text-lg font-bold text-white')
content = content.replace('text-2xl font-bold text-primary mb-1', 'text-2xl font-bold text-white mb-1')
content = content.replace('border-primary', 'border-white/30')
content = content.replace('ring-primary', 'ring-white/30')
content = content.replace('text-primary', 'text-blue-300') # Change any other text-primary to blue to preserve contrast but remove purple

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
