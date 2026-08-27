import sys
import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# 1. Update newPS state
content = content.replace(
    "const [newPS, setNewPS] = useState({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17 });",
    "const [newPS, setNewPS] = useState({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17, presentation_day: '', room_number: '' });"
)
content = content.replace(
    "setNewPS({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17 });",
    "setNewPS({ id: '', title: '', sponsor: '', description: '', categories: '', max_teams: 17, presentation_day: '', room_number: '' });"
)

# Update handlePSSubmit
handle_ps_submit_old = """      const { error } = await supabase.from('problem_statements').upsert({
        id: newPS.id,
        title: newPS.title,
        sponsor: newPS.sponsor,
        description: newPS.description,
        categories: categoriesArray,
        max_teams: newPS.max_teams
      });"""
handle_ps_submit_new = """      const { error } = await supabase.from('problem_statements').upsert({
        id: newPS.id,
        title: newPS.title,
        sponsor: newPS.sponsor,
        description: newPS.description,
        categories: categoriesArray,
        max_teams: newPS.max_teams,
        presentation_day: newPS.presentation_day || null,
        room_number: newPS.room_number || null
      });"""
content = content.replace(handle_ps_submit_old, handle_ps_submit_new)

# Update openEditModal to set newPS with day and room
open_edit_modal_old = """      setNewPS({
        id: modalPS.id,
        title: modalPS.title,
        sponsor: modalPS.sponsor || '',
        description: modalPS.description,
        categories: (modalPS.categories || []).join(', '),
        max_teams: modalPS.max_teams
      });"""
open_edit_modal_new = """      setNewPS({
        id: modalPS.id,
        title: modalPS.title,
        sponsor: modalPS.sponsor || '',
        description: modalPS.description,
        categories: (modalPS.categories || []).join(', '),
        max_teams: modalPS.max_teams,
        presentation_day: modalPS.presentation_day || '',
        room_number: modalPS.room_number || ''
      });"""
content = content.replace(open_edit_modal_old, open_edit_modal_new)

# Add Day and Room inputs to the PS form
ps_form_inputs_old = """                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Max Teams</label>
                        <input type="number" required min="1" value={newPS.max_teams} onChange={e=>setNewPS({...newPS, max_teams: parseInt(e.target.value)})} className="w-full text-sm py-2 px-3 bg-black/40 border border-white/20 rounded-lg w-full text-sm text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>"""
ps_form_inputs_new = """                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Max Teams</label>
                        <input type="number" required min="1" value={newPS.max_teams} onChange={e=>setNewPS({...newPS, max_teams: parseInt(e.target.value)})} className="w-full text-sm py-2 px-3 bg-black/40 border border-white/20 rounded-lg w-full text-sm text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Presentation Day</label>
                        <select value={newPS.presentation_day} onChange={e=>setNewPS({...newPS, presentation_day: e.target.value})} className="w-full text-sm py-2 px-3 bg-black/40 border border-white/20 rounded-lg w-full text-sm text-white">
                          <option value="">-- Select Day --</option>
                          <option value="31st August">31st August</option>
                          <option value="1st September">1st September</option>
                          <option value="2nd September">2nd September</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Room Number</label>
                        <input type="text" value={newPS.room_number} onChange={e=>setNewPS({...newPS, room_number: e.target.value})} className="w-full text-sm py-2 px-3 bg-black/40 border border-white/20 rounded-lg w-full text-sm text-white" placeholder="e.g. 201" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>"""
content = content.replace(ps_form_inputs_old, ps_form_inputs_new)

# 2. Add Delete option in Evaluate modal
eval_modal_buttons_old = """                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm px-6">Cancel</button>
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>"""
eval_modal_buttons_new = """                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm px-6">Cancel</button>
                {evaluations.find(e => e.team_id === teamToEvaluate.id) && (
                  <button type="button" onClick={() => handleDeleteMarks(teamToEvaluate.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold py-2 px-6 rounded-lg transition-all duration-300 text-sm">Delete Marks</button>
                )}
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>"""
content = content.replace(eval_modal_buttons_old, eval_modal_buttons_new)

# 3. Make Team Name clickable in evaluations
eval_team_name_old = """                            <td className="p-4 text-sm">
                              <p className="font-semibold text-white">{team.team_name}</p>
                              <p className="text-xs text-gray-400">{team.tl_email}</p>
                            </td>"""
eval_team_name_new = """                            <td className="p-4 text-sm">
                              <p className="font-semibold text-white cursor-pointer hover:underline" onClick={() => setSelectedTeam(team)}>{team.team_name}</p>
                              <p className="text-xs text-gray-400">{team.tl_email}</p>
                            </td>"""
content = content.replace(eval_team_name_old, eval_team_name_new)

# 4. Remove purple focus states
content = content.replace('focus:ring-primary focus:border-primary', 'focus:ring-white/30 focus:border-white/30')

# Also fix the weird emojis in Certificates and Logistics headers (replaced with typical lucide icons or neutral)
content = content.replace('<div className="p-2 bg-primary/10 text-primary rounded-lg">??</div>', '')
content = content.replace('<div className="p-2 bg-primary/10 text-primary rounded-lg">🏫</div>', '')

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
