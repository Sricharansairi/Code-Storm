import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The evaluations tab content
evaluations_tab = """
          {activeTab === 'evaluations' && (
            <motion.div 
              key="evaluations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-6"
            >
              <div className="card">
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
              </div>

              <div className="card overflow-hidden p-0">
                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-xl font-bold text-white">Teams Evaluation</h2>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Presentation Day</label>
                      <select value={evalFilterDay} onChange={e => setEvalFilterDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary max-w-[150px]">
                        <option value="All">All Days</option>
                        <option value="31st August">31st August</option>
                        <option value="1st September">1st September</option>
                        <option value="2nd September">2nd September</option>
                      </select>
                    </div>

                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Problem Statement</label>
                      <select value={evalFilterPS} onChange={e => setEvalFilterPS(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary max-w-[150px]">
                        {allocatedProblemStatements.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col w-full md:w-auto">
                      <label className="text-xs text-gray-300 mb-1">Status</label>
                      <select value={evalFilterStatus} onChange={e => setEvalFilterStatus(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary max-w-[150px]">
                        <option value="All">All</option>
                        <option value="Evaluated">Evaluated</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-300 text-sm bg-black/20">
                        <th className="p-4 font-semibold w-12 text-center">#</th>
                        <th className="p-4 font-semibold">Team Name</th>
                        <th className="p-4 font-semibold">PS / Day / Room</th>
                        <th className="p-4 font-semibold text-center">Score (100)</th>
                        <th className="p-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.filter(t => {
                        const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
                        if (!ps) return false;
                        if (evalFilterDay !== 'All' && ps.presentation_day !== evalFilterDay) return false;
                        if (evalFilterPS !== 'All' && ps.id !== evalFilterPS) return false;
                        const isEvaluated = evaluations.some(e => e.team_id === t.id);
                        if (evalFilterStatus === 'Evaluated' && !isEvaluated) return false;
                        if (evalFilterStatus === 'Pending' && isEvaluated) return false;
                        return true;
                      }).map((team, index) => {
                        const ps = problemStatements.find(p => p.id === team.allocated_ps_id);
                        const evaluation = evaluations.find(e => e.team_id === team.id);
                        return (
                          <tr key={team.id} className="border-b border-white/10 hover:bg-black/20 transition-colors">
                            <td className="p-4 text-sm text-center text-gray-300 font-medium">{index + 1}</td>
                            <td className="p-4 text-sm">
                              <p className="font-semibold text-white">{team.team_name}</p>
                              <p className="text-xs text-gray-400">{team.tl_email}</p>
                            </td>
                            <td className="p-4 text-sm">
                              <p className="font-medium text-blue-400">{ps?.id || 'N/A'}</p>
                              <p className="text-xs text-gray-300">{ps?.presentation_day || 'No Day'} • Room: {ps?.room_number || 'N/A'}</p>
                            </td>
                            <td className="p-4 text-sm text-center">
                              {evaluation ? (
                                <span className="font-bold text-green-400 text-lg">{evaluation.total_score}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-right">
                              <button 
                                onClick={() => {
                                  setTeamToEvaluate(team);
                                  if (evaluation) {
                                    setEvalScores({
                                      cat1: evaluation.cat1_score, cat2: evaluation.cat2_score,
                                      cat3: evaluation.cat3_score, cat4: evaluation.cat4_score
                                    });
                                  } else {
                                    setEvalScores({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });
                                  }
                                  setEvalModalOpen(true);
                                }}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${evaluation ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-primary text-black hover:bg-primary/90'}`}
                              >
                                {evaluation ? 'Edit Marks' : 'Evaluate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'certificates' && (
            <motion.div 
              key="certificates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="card max-w-2xl mx-auto text-center py-12"
            >
              <div className="w-16 h-16 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <Download size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Certificate Generation</h2>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                The mechanism for uploading a participation certificate template and enabling dynamic generation is currently under development.
              </p>
              
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 bg-black/20">
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-300 mb-1">Template Upload Placeholder</p>
                <p className="text-xs text-gray-500">Coming soon in a future update.</p>
              </div>
            </motion.div>
          )}
"""

idx = content.rfind("</AnimatePresence>")
if idx != -1:
    content = content[:idx] + evaluations_tab + content[idx:]
    with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Evaluation and Certificate tabs.")
else:
    print("Error: Could not find </AnimatePresence>")
