import re
import sys

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update activeTab state
content = re.sub(
    r"const \[activeTab, setActiveTab\] = useState<.*?>\('dashboard'\);",
    "const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'settings' | 'evaluations' | 'certificates' | 'logistics'>('dashboard');",
    content
)

# 2. Add Coordinators state
coord_state = """
  // Coordinators States
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [logisticsDay, setLogisticsDay] = useState('31st August');

  const fetchCoordinators = async () => {
    const { data } = await supabase.from('room_coordinators').select('*');
    if (data) setCoordinators(data);
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);
"""
content = content.replace(
    "const [evaluations, setEvaluations] = useState<any[]>([]);",
    "const [evaluations, setEvaluations] = useState<any[]>([]);\n" + coord_state
)

# 3. Add Logistics Tab button
logistics_tab_button = """              <button 
                onClick={() => setActiveTab('logistics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'logistics' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Logistics
              </button>
"""
content = content.replace(
    """              <button 
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'certificates' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Certificates
              </button>""",
    """              <button 
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'certificates' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Certificates
              </button>\n""" + logistics_tab_button
)


# 4. Modify evaluations table header and row to show update count
content = content.replace(
    """<th className="p-4 font-semibold text-center">Score (100)</th>""",
    """<th className="p-4 font-semibold text-center">Score (100)</th>
       <th className="p-4 font-semibold text-center">Updates</th>"""
)

# We need to find the exact render for the table row
# The previous injection put: `<td className="p-4 text-sm text-center">\n                              {evaluation ? (\n                                <span className="font-bold text-green-400 text-lg">{evaluation.total_score}</span>\n                              ) : (\n                                <span className="text-gray-500">-</span>\n                              )}\n                            </td>\n                            <td className="p-4 text-sm text-right">`

content = content.replace(
    """<span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-right">""",
    """<span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-center text-gray-400">
                              {evaluation?.update_count || 0}
                            </td>
                            <td className="p-4 text-sm text-right">"""
)


# 5. Modify evaluation save logic to increment update_count
# Previous injection:
#                 const evalData = {
#                   team_id: teamToEvaluate.id,
#                   cat1_score: Number(evalScores.cat1),
#                   cat2_score: Number(evalScores.cat2),
#                   cat3_score: Number(evalScores.cat3),
#                   cat4_score: Number(evalScores.cat4),
#                   total_score: total,
#                   evaluated_by: session.user.email
#                 };

new_eval_data = """
                const existingEval = evaluations.find(e => e.team_id === teamToEvaluate.id);
                const evalData = {
                  team_id: teamToEvaluate.id,
                  cat1_score: Number(evalScores.cat1),
                  cat2_score: Number(evalScores.cat2),
                  cat3_score: Number(evalScores.cat3),
                  cat4_score: Number(evalScores.cat4),
                  total_score: total,
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1
                };
"""

content = content.replace(
    """                const evalData = {
                  team_id: teamToEvaluate.id,
                  cat1_score: Number(evalScores.cat1),
                  cat2_score: Number(evalScores.cat2),
                  cat3_score: Number(evalScores.cat3),
                  cat4_score: Number(evalScores.cat4),
                  total_score: total,
                  evaluated_by: session.user.email
                };""",
    new_eval_data
)

# 6. Add Logistics Tab Content
logistics_tab = """
          {activeTab === 'logistics' && (
            <motion.div 
              key="logistics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
              className="space-y-6"
            >
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Logistics & Coordinators</h2>
                  <div className="flex flex-col w-full md:w-auto">
                      <select value={logisticsDay} onChange={e => setLogisticsDay(e.target.value)} className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-2 px-3 focus:ring-primary focus:border-primary">
                        <option value="31st August">Day 1: 31st August</option>
                        <option value="1st September">Day 2: 1st September</option>
                        <option value="2nd September">Day 3: 2nd September</option>
                      </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Derive rooms based on PS assigned to this day */}
                  {Array.from(new Set(
                    problemStatements
                      .filter(ps => ps.presentation_day === logisticsDay && ps.room_number)
                      .map(ps => ps.room_number)
                  )).map(room => {
                    const coord = coordinators.find(c => c.presentation_day === logisticsDay && c.room_number === room) || {};
                    return (
                      <div key={room} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-shrink-0">
                          <h4 className="text-lg font-bold text-primary">Room {room}</h4>
                          <p className="text-xs text-gray-400">Problem Statements: {
                            problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number === room).map(ps => ps.id).join(', ')
                          }</p>
                        </div>
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Faculty Coordinator</label>
                            <input 
                              type="text" 
                              defaultValue={coord.faculty_coordinator || ''}
                              onBlur={async (e) => {
                                await supabase.from('room_coordinators').upsert({
                                  presentation_day: logisticsDay,
                                  room_number: room,
                                  faculty_coordinator: e.target.value
                                }, { onConflict: 'presentation_day,room_number' });
                                fetchCoordinators();
                              }}
                              className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-primary text-white" 
                              placeholder="Name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Student Coordinator</label>
                            <input 
                              type="text" 
                              defaultValue={coord.student_coordinator || ''}
                              onBlur={async (e) => {
                                await supabase.from('room_coordinators').upsert({
                                  presentation_day: logisticsDay,
                                  room_number: room,
                                  student_coordinator: e.target.value
                                }, { onConflict: 'presentation_day,room_number' });
                                fetchCoordinators();
                              }}
                              className="w-full text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-primary text-white" 
                              placeholder="Name"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number).length === 0 && (
                    <div className="text-center p-8 border border-white/10 rounded-xl border-dashed">
                      <p className="text-gray-400">No rooms have been assigned to Problem Statements for this day yet.</p>
                      <p className="text-xs text-gray-500 mt-2">Go to the Overview tab and edit a Problem Statement to set its Presentation Day and Room Number.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
"""

idx = content.rfind("</AnimatePresence>")
if idx != -1:
    content = content[:idx] + logistics_tab + content[idx:]
    with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Logistics Tab and Update count.")
else:
    print("Error: Could not find </AnimatePresence>")
