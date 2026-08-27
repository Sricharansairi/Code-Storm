import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleDeleteMarks logic
delete_marks_func = """
  const handleDeleteMarks = async (teamId: string) => {
    const passcode = prompt("Enter Master Passcode to delete marks:");
    if (passcode !== 'INDUS') {
      alert("Incorrect passcode. Deletion cancelled.");
      return;
    }
    
    const { error } = await supabase.from('evaluations').delete().eq('team_id', teamId);
    if (error) {
      alert("Error deleting marks: " + error.message);
    } else {
      alert("Marks successfully deleted.");
      fetchEvalData();
    }
  };

  const handleDeleteCoordinators = async (day: string, room: string) => {
    const { error } = await supabase.from('room_coordinators').delete().eq('presentation_day', day).eq('room_number', room);
    if (error) {
      alert("Error deleting coordinators: " + error.message);
    } else {
      fetchCoordinators();
    }
  };
"""

content = content.replace("  const handleExportLogistics = () => {", delete_marks_func + "\n  const handleExportLogistics = () => {")

# 2. Add Delete Marks Button to Evaluation Table rows
eval_table_action = """
                            <td className="p-4 text-sm text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setTeamToEvaluate(team);
                                    if (evaluation) {
                                      setEvalScores({
                                        cat1: evaluation.cat1_score || 0,
                                        cat2: evaluation.cat2_score || 0,
                                        cat3: evaluation.cat3_score || 0,
                                        cat4: evaluation.cat4_score || 0
                                      });
                                    } else {
                                      setEvalScores({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });
                                    }
                                    setEvalModalOpen(true);
                                  }}
                                  className={`btn-primary text-xs px-3 py-1.5 ${evaluation ? 'bg-primary/20 text-primary border border-primary/30' : ''}`}
                                >
                                  {evaluation ? 'Edit Marks' : 'Evaluate'}
                                </button>
                                {evaluation && (
                                  <button onClick={() => handleDeleteMarks(team.id)} className="btn-secondary text-xs px-2 py-1.5 text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
"""

content = re.sub(
    r'<td className="p-4 text-sm text-right">\s*<button\s*onClick=\{[^{}]*?setEvalModalOpen\(true\);\s*\}\s*className=.*?>\s*\{evaluation \? \'Edit Marks\' : \'Evaluate\'\}\s*</button>\s*</td>',
    eval_table_action,
    content,
    flags=re.DOTALL
)

# 3. Add Delete Coordinators button to Logistics tab
logistics_delete_button = """
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
"""
# find the line `                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">`
# and we also want to add a trash button next to the inputs or at the end.
logistics_delete_button_full = """
                        <div className="flex-grow flex gap-4 items-center">
                          <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
"""
content = content.replace(
    """                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">""",
    logistics_delete_button_full
)

logistics_delete_end = """
                          </div>
                          {coord.id && (
                            <button 
                              onClick={() => handleDeleteCoordinators(logisticsDay, room)} 
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/30 transition-colors"
                              title="Clear Coordinators"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
"""
content = content.replace(
    """                            />
                          </div>
                        </div>
                      </div>""",
    """                            />
                          </div>
""" + logistics_delete_end + """                      </div>"""
)

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Deletion features.")
