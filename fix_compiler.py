import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# 1. Add Export to Excel button next to Teams Evaluation
content = content.replace(
    '<h2 className="text-xl font-bold text-white">Teams Evaluation</h2>',
    '<h2 className="text-xl font-bold text-white flex items-center gap-4">Teams Evaluation <button onClick={handleExportEvaluations} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-sm px-3 py-1 rounded"><Download size={16} /> Export</button></h2>'
)

# 2. Add Delete Marks button inside the action row in the table
content = content.replace(
    '<button onClick={() => { setTeamToEvaluate(team); setEvalModalOpen(true); setModalType(\'evaluate\'); }} className="text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 py-1.5 px-3 rounded shadow-sm">Evaluate</button>',
    '<div className="flex items-center gap-2"><button onClick={() => { setTeamToEvaluate(team); setEvalModalOpen(true); setModalType(\'evaluate\'); }} className="text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 py-1.5 px-3 rounded shadow-sm">Evaluate</button> <button onClick={() => handleDeleteMarks(team.id)} className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 backdrop-blur-md border border-red-500/20 py-1.5 px-3 rounded shadow-sm" title="Delete Marks"><Trash2 size={16}/></button></div>'
)

# 3. Add evalFilterRoom in the select for the evaluation tab filters (right next to Problem Statement)
content = content.replace(
    '</select>\n                    </div>\n                    \n                    <div className="flex flex-col w-full md:w-auto">',
    '</select>\n                    </div>\n                    <div className="flex flex-col w-full md:w-auto"><label className="text-xs text-gray-300 mb-1">Room</label><select value={evalFilterRoom} onChange={e => setEvalFilterRoom(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary max-w-[150px]"><option value="All">All Rooms</option></select></div>\n                    <div className="flex flex-col w-full md:w-auto">'
)

# 4. Fix evalSettings type error for mapping over categories
content = content.replace(
    '{(evalSettings?.categories || []).map((cat: any) => (',
    '{((evalSettings?.categories as any[]) || []).map((cat: any) => ('
)

# 5. Fix type issue for `setEvalScores({...evalScores, [cat.id]: ...})`
# The compiler complains: Argument of type 'Record<string, number>' is not assignable to parameter of type 'SetStateAction<{ cat1: number; cat2: number; cat3: number; cat4: number; }>'.
content = content.replace(
    'const [evalScores, setEvalScores] = useState({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });',
    'const [evalScores, setEvalScores] = useState<Record<string, number>>({});'
)

# 6. Move the Evaluation Settings from Evaluations Tab to Settings Tab
# The Evaluation settings block is:
eval_settings_block = """              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Evaluation Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={`cat_${num}`}>
                      <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Category {num}</label>
                      <input 
                        type="text" 
                        value={evalSettings[`category_${num}`] || ''} 
                        onChange={(e) => setEvalSettings({...evalSettings, [`category_${num}`]: e.target.value})}
                        className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/30 text-white" 
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={async () => {
                      const { error } = await supabase.from('evaluation_settings').update(evalSettings).eq('id', 1);
                      if (error) alert("Error saving settings: " + error.message);
                      else alert("Settings saved!");
                    }}
                    className="btn-primary py-2 px-6 text-sm"
                  >
                    Save Categories
                  </button>
                </div>
              </div>"""
content = content.replace(eval_settings_block, '')

# We will put a new dynamic Evaluation Settings block inside Settings tab
new_eval_settings_block = """              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Dynamic Evaluation Schema</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {((evalSettings?.categories as any[]) || []).map((cat: any, index: number) => (
                    <div key={cat.id} className="relative">
                      <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">{cat.name}</label>
                      <input 
                        type="text" 
                        value={cat.name} 
                        onChange={(e) => {
                          const newCats = [...(evalSettings.categories || [])];
                          newCats[index].name = e.target.value;
                          setEvalSettings({...evalSettings, categories: newCats});
                        }}
                        className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/30 text-white pr-8" 
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-xs font-bold text-gray-200 uppercase tracking-wider mb-1">Max Total Marks</label>
                    <input 
                      type="number" 
                      value={evalSettings?.maxMarks || 100} 
                      onChange={(e) => setEvalSettings({...evalSettings, maxMarks: Number(e.target.value)})}
                      className="w-32 text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/30 text-white" 
                    />
                  </div>
                  
                  <div className="flex-grow flex justify-end items-end gap-2">
                    <button 
                      onClick={async () => {
                        const { error } = await supabase.from('evaluation_settings').update({ categories: evalSettings.categories, maxMarks: evalSettings.maxMarks }).eq('id', 1);
                        if (error) alert("Error saving settings: " + error.message);
                        else alert("Evaluation Schema saved successfully!");
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 px-6 py-2 rounded shadow-sm text-sm"
                    >
                      Save Schema
                    </button>
                  </div>
                </div>
              </div>"""

content = content.replace(
    '<div className="card max-w-4xl mx-auto">',
    new_eval_settings_block + '\n<div className="card max-w-4xl mx-auto mt-6">'
)

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
