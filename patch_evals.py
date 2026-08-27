import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# 1. Update initial evalSettings state
content = content.replace(
    "const [evalSettings, setEvalSettings] = useState<any>({ category_1: 'Innovation', category_2: 'Feasibility', category_3: 'Presentation', category_4: 'Technicality' });",
    "const [evalSettings, setEvalSettings] = useState<any>({ categories: [{ id: 'cat1', name: 'Innovation' }, { id: 'cat2', name: 'Feasibility' }, { id: 'cat3', name: 'Presentation' }, { id: 'cat4', name: 'Technicality' }], maxMarks: 100 });"
)

# 2. Update initScores in modal
content = content.replace(
    "setEvalScores({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });",
    "const initScores: Record<string, number> = {}; (evalSettings?.categories || []).forEach((c: any) => initScores[c.id] = 0); setEvalScores(initScores);"
)

# 3. Update the handleModalSubmit logic
old_submit = """                const total = Number(evalScores.cat1) + Number(evalScores.cat2) + Number(evalScores.cat3) + Number(evalScores.cat4);
                
                const existingEval = evaluations.find(e => e.team_id === teamToEvaluate.id);
                const evalData = {
                  team_id: teamToEvaluate.id,
                  category_1: evalScores.cat1,
                  category_2: evalScores.cat2,
                  category_3: evalScores.cat3,
                  category_4: evalScores.cat4,
                  total_score: total,
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1
                };"""
new_submit = """                let total = 0;
                Object.values(evalScores).forEach(v => total += Number(v));
                
                const existingEval = evaluations.find(e => e.team_id === teamToEvaluate.id);
                const evalData = {
                  team_id: teamToEvaluate.id,
                  scores: evalScores,
                  total_score: total,
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1
                };"""
content = content.replace(old_submit, new_submit)

# Also fix the evaluation rendering in the table
old_eval_table_cols = """                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Score (100)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Updates</th>"""
new_eval_table_cols = """                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Score ({evalSettings?.maxMarks || 100})</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Updates</th>"""
content = content.replace(old_eval_table_cols, new_eval_table_cols)

# We also need to fix the modal render part for evaluations to use dynamic categories
old_modal_inputs = """              {modalType === 'evaluate' && teamToEvaluate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{evalSettings?.category_1 || 'Category 1'} (25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        value={evalScores.cat1}
                        onChange={e => setEvalScores({...evalScores, cat1: e.target.value ? Number(e.target.value) : 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{evalSettings?.category_2 || 'Category 2'} (25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        value={evalScores.cat2}
                        onChange={e => setEvalScores({...evalScores, cat2: e.target.value ? Number(e.target.value) : 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{evalSettings?.category_3 || 'Category 3'} (25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        value={evalScores.cat3}
                        onChange={e => setEvalScores({...evalScores, cat3: e.target.value ? Number(e.target.value) : 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{evalSettings?.category_4 || 'Category 4'} (25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        value={evalScores.cat4}
                        onChange={e => setEvalScores({...evalScores, cat4: e.target.value ? Number(e.target.value) : 0})}
                      />
                    </div>
                  </div>
                </div>
              )}"""

new_modal_inputs = """              {modalType === 'evaluate' && teamToEvaluate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {(evalSettings?.categories || []).map((cat: any) => (
                      <div key={cat.id}>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{cat.name}</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                          value={evalScores[cat.id] || ''}
                          onChange={e => setEvalScores({...evalScores, [cat.id]: e.target.value ? Number(e.target.value) : 0})}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}"""
content = content.replace(old_modal_inputs, new_modal_inputs)


open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
