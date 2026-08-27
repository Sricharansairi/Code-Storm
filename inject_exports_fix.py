import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

filtered_teams_def = """
  const filteredEvalTeams = teams.filter(t => {
    const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
    if (!ps) return false;
    if (evalFilterDay !== 'All' && ps.presentation_day !== evalFilterDay) return false;
    if (evalFilterPS !== 'All' && ps.id !== evalFilterPS) return false;
    const isEvaluated = evaluations.some(e => e.team_id === t.id);
    if (evalFilterStatus === 'Evaluated' && !isEvaluated) return false;
    if (evalFilterStatus === 'Pending' && isEvaluated) return false;
    return true;
  });

  const handleExportEvaluations = () => {
"""

content = content.replace("  const handleExportEvaluations = () => {", filtered_teams_def)
content = content.replace("const exportData = filteredEvalTeams.map((t, index) => {", "const exportData = filteredEvalTeams.map((t: any, index: number) => {")

jsx_replace = """{teams.filter(t => {
                        const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
                        if (!ps) return false;
                        if (evalFilterDay !== 'All' && ps.presentation_day !== evalFilterDay) return false;
                        if (evalFilterPS !== 'All' && ps.id !== evalFilterPS) return false;
                        const isEvaluated = evaluations.some(e => e.team_id === t.id);
                        if (evalFilterStatus === 'Evaluated' && !isEvaluated) return false;
                        if (evalFilterStatus === 'Pending' && isEvaluated) return false;
                        return true;
                      }).map((team, index) => {"""

new_jsx = """{filteredEvalTeams.map((team, index) => {"""

content = content.replace(jsx_replace, new_jsx)

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed filteredEvalTeams.")
