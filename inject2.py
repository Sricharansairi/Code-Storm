import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Day and Room inputs to PS modal
ps_inputs = """
                      <div>
                        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Presentation Day</label>
                        <select 
                          value={modalPS?.presentation_day || '31st August'} 
                          onChange={(e) => setModalPS({...modalPS, presentation_day: e.target.value})}
                          className="w-full text-sm py-2 px-3 bg-black/30 border border-white/20 rounded-lg focus:ring-primary focus:border-primary text-white"
                        >
                          <option value="31st August" className="bg-gray-900">31st August</option>
                          <option value="1st September" className="bg-gray-900">1st September</option>
                          <option value="2nd September" className="bg-gray-900">2nd September</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Room Number</label>
                        <input 
                          type="text" 
                          value={modalPS?.room_number || ''} 
                          onChange={(e) => setModalPS({...modalPS, room_number: e.target.value})}
                          className="w-full text-sm py-2 px-3 bg-black/30 border border-white/20 rounded-lg focus:ring-primary focus:border-primary text-white" 
                          placeholder="e.g. 101, Lab A" 
                        />
                      </div>
"""

# We need to insert this into the `modalType === 'edit'` form.
# The edit form currently has:
#                       <div>
#                         <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Title</label>
#                         <input type="text" required value={modalPS?.title || ''} onChange={(e) => setModalPS({...modalPS, title: e.target.value})} className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg" />
#                       </div>

content = content.replace(
    """                      <div>
                        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Title</label>""",
    ps_inputs + """                      <div>
                        <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Title</label>"""
)

# And in handleModalSubmit, for edit, we need to pass these new fields:
handle_submit_replace = """
        const { error } = await supabase.from('problem_statements').update({
          title: modalPS.title,
          sponsor: modalPS.sponsor,
          description: modalPS.description,
          max_teams: parseInt(modalPS.max_teams) || 17,
          presentation_day: modalPS.presentation_day,
          room_number: modalPS.room_number
        }).eq('id', modalPS.id);
"""

# Need a regex to replace the specific update call for modalType === 'edit'
# Let's see how it looks currently...
#         const { error } = await supabase.from('problem_statements').update({
#           title: modalPS.title,
#           sponsor: modalPS.sponsor,
#           description: modalPS.description,
#           max_teams: parseInt(modalPS.max_teams) || 17
#         }).eq('id', modalPS.id);

content = re.sub(
    r"const \{ error \} = await supabase\.from\('problem_statements'\)\.update\(\{\s*title: modalPS\.title,\s*sponsor: modalPS\.sponsor,\s*description: modalPS\.description,\s*max_teams: parseInt\(modalPS\.max_teams\) \|\| 17\s*\}\)\.eq\('id', modalPS\.id\);",
    """const { error } = await supabase.from('problem_statements').update({
          title: modalPS.title,
          sponsor: modalPS.sponsor,
          description: modalPS.description,
          max_teams: parseInt(modalPS.max_teams) || 17,
          presentation_day: modalPS.presentation_day,
          room_number: modalPS.room_number
        }).eq('id', modalPS.id);""",
    content
)

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected PS day/room inputs.")
