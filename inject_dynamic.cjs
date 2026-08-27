const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. evalSettings and evalScores state
content = content.replace(
  "const [evalSettings, setEvalSettings] = useState<any>({ category_1: 'Innovation', category_2: 'Feasibility', category_3: 'Presentation', category_4: 'Technicality' });",
  "const [evalSettings, setEvalSettings] = useState<any>({ categories: [{id: 'cat1', name: 'Innovation', maxMarks: 25}, {id: 'cat2', name: 'Feasibility', maxMarks: 25}, {id: 'cat3', name: 'Presentation', maxMarks: 25}, {id: 'cat4', name: 'Technicality', maxMarks: 25}] });"
);

content = content.replace(
  "const [evalScores, setEvalScores] = useState({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });",
  "const [evalScores, setEvalScores] = useState<Record<string, number>>({});"
);

// 2. Settings tab UI for Evaluation categories
const settingsReplace = `
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-white">Evaluation Categories</h4>
                      <button onClick={() => {
                        const newCats = [...(evalSettings?.categories || [])];
                        newCats.push({ id: 'cat' + Date.now(), name: 'New Category', maxMarks: 25 });
                        setEvalSettings({...evalSettings, categories: newCats});
                      }} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                        <Plus size={14} /> Add Category
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(evalSettings?.categories || []).map((cat: any, index: number) => (
                        <div key={cat.id} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            value={cat.name} 
                            onChange={e => {
                              const newCats = [...evalSettings.categories];
                              newCats[index].name = e.target.value;
                              setEvalSettings({...evalSettings, categories: newCats});
                            }}
                            className="flex-grow text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-primary text-white" 
                            placeholder="Category Name"
                          />
                          <input 
                            type="number" 
                            value={cat.maxMarks} 
                            onChange={e => {
                              const newCats = [...evalSettings.categories];
                              newCats[index].maxMarks = Number(e.target.value);
                              setEvalSettings({...evalSettings, categories: newCats});
                            }}
                            className="w-24 text-sm py-2 px-3 border border-white/20 rounded-lg bg-black/40 focus:border-primary text-white" 
                            placeholder="Max Marks"
                          />
                          <button onClick={() => {
                            const newCats = [...evalSettings.categories];
                            newCats.splice(index, 1);
                            setEvalSettings({...evalSettings, categories: newCats});
                          }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/30 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
`;

content = content.replace(
  /                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?                  <\/div>\s*<\/div>/g,
  settingsReplace + "\n                </div>"
);

// 3. Export Logic (Evaluations)
// The current handleExportEvaluations has hardcoded categories. We need to rebuild it dynamically.
const exportEvaluationsMatch = /const handleExportEvaluations = \(\) => \{[\s\S]*?XLSX\.writeFile\(workbook, "CodeStorm_Evaluations\.xlsx"\);\n  \};/;
const exportEvaluationsReplace = `const handleExportEvaluations = () => {
    const exportData = filteredEvalTeams.map((t: any, index: number) => {
      const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
      const evalData = evaluations.find(e => e.team_id === t.id);
      const rowData: any = {
        'Sl No': index + 1,
        'Team Name': t.team_name,
        'TL Name': t.tl_name,
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile,
        'Problem Statement ID': t.allocated_ps_id || '-',
        'Presentation Day': ps?.presentation_day || '-',
        'Room Number': ps?.room_number || '-'
      };
      
      (evalSettings?.categories || []).forEach((cat: any) => {
        rowData[cat.name + ' (Max ' + cat.maxMarks + ')'] = evalData && evalData.scores ? (evalData.scores[cat.id] || 0) : '-';
      });
      
      rowData['Total Score'] = evalData ? evalData.total_score : '-';
      rowData['Updates Count'] = evalData ? (evalData.update_count || 0) : 0;
      rowData['Evaluated By'] = evalData ? evalData.evaluated_by : '-';
      
      return rowData;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluations");
    XLSX.writeFile(workbook, "CodeStorm_Evaluations.xlsx");
  };`;
content = content.replace(exportEvaluationsMatch, exportEvaluationsReplace);

// 4. Update the "Score (100)" header in Evaluations table
content = content.replace(
  `<th className="p-4 font-semibold text-center">Score (100)</th>`,
  `<th className="p-4 font-semibold text-center">Score</th>`
);

// 5. Update Edit modal mapping (in table row)
const editRowReplace = `
                                    if (evaluation && evaluation.scores) {
                                      setEvalScores(evaluation.scores);
                                    } else {
                                      const initScores: Record<string, number> = {};
                                      (evalSettings?.categories || []).forEach((c: any) => initScores[c.id] = 0);
                                      setEvalScores(initScores);
                                    }
`;
content = content.replace(
  /                                    if \(evaluation\) \{[\s\S]*?                                      \}\);[\s\S]*?                                    \} else \{[\s\S]*?                                      setEvalScores\(\{ cat1: 0, cat2: 0, cat3: 0, cat4: 0 \}\);[\s\S]*?                                    \}/g,
  editRowReplace
);

// 6. Update Evaluate Modal form submission
const modalSubmitReplace = `
                let total = 0;
                Object.values(evalScores).forEach(v => total += Number(v));
                
                const existingEval = evaluations.find(e => e.team_id === teamToEvaluate.id);
                const evalData = {
                  team_id: teamToEvaluate.id,
                  scores: evalScores,
                  total_score: total,
                  evaluated_by: session.user.email,
                  update_count: existingEval ? (existingEval.update_count || 0) + 1 : 1
                };
`;
content = content.replace(
  /                const total = Number\(evalScores\.cat1\) \+ Number\(evalScores\.cat2\) \+ Number\(evalScores\.cat3\) \+ Number\(evalScores\.cat4\);[\s\S]*?                  update_count: existingEval \? \(existingEval\.update_count || 0\) \+ 1 : 1\n                \};/g,
  modalSubmitReplace
);

// 7. Update Evaluate Modal UI fields
const modalUIReplace = `
                {(evalSettings?.categories || []).map((cat: any) => (
                  <div key={cat.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                    <label className="text-sm font-semibold text-white">{cat.name}</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={cat.maxMarks} 
                      required 
                      value={evalScores[cat.id] || ''} 
                      onChange={e => setEvalScores({...evalScores, [cat.id]: Number(e.target.value)})} 
                      className="w-20 text-center py-1.5 px-2 bg-black/40 border border-white/20 rounded focus:border-primary text-white font-bold" 
                    />
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                  <span className="text-sm text-gray-400 uppercase tracking-wider font-bold">Total Score</span>
                  <span className="text-2xl font-black text-primary">
                    {Object.values(evalScores).reduce((a, b) => a + Number(b), 0)} <span className="text-sm text-gray-500 font-normal">/ {(evalSettings?.categories || []).reduce((a: any, b: any) => a + Number(b.maxMarks), 0)}</span>
                  </span>
                </div>
`;
content = content.replace(
  /                <div className="flex justify-between items-center bg-black\/20 p-3 rounded-lg border border-white\/5">[\s\S]*?                <\/div>\s*<\/div>/g,
  modalUIReplace + "\n              </div>"
);

// Fix the "Assign marks out of 25 for each category." static text
content = content.replace(
  `<p className="text-sm text-gray-300 mb-2">Assign marks out of 25 for each category.</p>`,
  `<p className="text-sm text-gray-300 mb-2">Assign marks for each category according to their maximum value.</p>`
);

// 8. Add "Clear Logistics" to the problem statement edit modal
const clearLogisticsButton = `
                      <button 
                        type="button" 
                        onClick={() => {
                          setModalPS({...modalPS, presentation_day: '', room_number: ''});
                        }} 
                        className="btn-secondary text-sm px-4 mr-auto text-red-400 border-red-500/30 hover:bg-red-500/10"
                      >
                        Clear Room/Day
                      </button>
                      <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm px-6">Cancel</button>
`;
content = content.replace(
  `<button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm px-6">Cancel</button>`,
  clearLogisticsButton
);


fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
console.log("Injections complete.");
