import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

eval_modal = """
      {/* Evaluation Modal */}
      {evalModalOpen && teamToEvaluate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="card w-full max-w-md overflow-hidden border-primary/30">
            <div className="px-6 py-4 border-b border-primary/20 flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary">
                Evaluate: {teamToEvaluate.team_name}
              </h3>
              <button type="button" onClick={() => setEvalModalOpen(false)} className="text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-black/30 backdrop-blur-xl/10">
                <X size={20} />
              </button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingEval(true);
                const total = Number(evalScores.cat1) + Number(evalScores.cat2) + Number(evalScores.cat3) + Number(evalScores.cat4);
                
                const evalData = {
                  team_id: teamToEvaluate.id,
                  cat1_score: Number(evalScores.cat1),
                  cat2_score: Number(evalScores.cat2),
                  cat3_score: Number(evalScores.cat3),
                  cat4_score: Number(evalScores.cat4),
                  total_score: total,
                  evaluated_by: session.user.email
                };
                
                const { error } = await supabase.from('evaluations').upsert(evalData, { onConflict: 'team_id' });
                
                setSavingEval(false);
                if (error) {
                  alert("Error saving evaluation: " + error.message);
                } else {
                  alert("Evaluation saved successfully!");
                  setEvalModalOpen(false);
                  fetchEvalData(); // Refresh data
                }
              }} 
              className="p-6"
            >
              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-300 mb-2">Assign marks out of 25 for each category.</p>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{evalSettings.category_1 || 'Category 1'}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat1} onChange={e => setEvalScores({...evalScores, cat1: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-primary text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{evalSettings.category_2 || 'Category 2'}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat2} onChange={e => setEvalScores({...evalScores, cat2: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-primary text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{evalSettings.category_3 || 'Category 3'}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat3} onChange={e => setEvalScores({...evalScores, cat3: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-primary text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                  <label className="text-sm font-semibold text-white">{evalSettings.category_4 || 'Category 4'}</label>
                  <input type="number" min="0" max="25" required value={evalScores.cat4} onChange={e => setEvalScores({...evalScores, cat4: e.target.value as any})} className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-primary text-white font-bold" />
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                  <span className="text-sm text-gray-400 uppercase tracking-wider font-bold">Total Score</span>
                  <span className="text-2xl font-black text-primary">
                    {Number(evalScores.cat1) + Number(evalScores.cat2) + Number(evalScores.cat3) + Number(evalScores.cat4)} <span className="text-sm text-gray-500 font-normal">/ 100</span>
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEvalModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={savingEval} className="btn-primary text-sm px-6">
                  {savingEval ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""

# Insert right before the final </div> which ends the AdminDashboard component.
idx = content.rfind("</div>")
if idx != -1:
    # Need to check if there are multiple divs, but `rfind` gives the absolute last one.
    content = content[:idx] + eval_modal + content[idx:]
    with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Evaluation modal.")
else:
    print("Error: Could not find final </div>")
