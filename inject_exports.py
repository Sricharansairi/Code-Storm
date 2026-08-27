import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject functions
new_functions = """
  const handleExportEvaluations = () => {
    const exportData = filteredEvalTeams.map((t, index) => {
      const ps = problemStatements.find(p => p.id === t.allocated_ps_id);
      const evalData = evaluations.find(e => e.team_id === t.id);
      return {
        'Sl No': index + 1,
        'Team Name': t.team_name,
        'TL Name': t.tl_name,
        'TL Email': t.tl_email,
        'TL Mobile': t.tl_mobile,
        'Problem Statement ID': t.allocated_ps_id || '-',
        'Presentation Day': ps?.presentation_day || '-',
        'Room Number': ps?.room_number || '-',
        [evalSettings.category_1 || 'Category 1']: evalData ? evalData.cat1_score : '-',
        [evalSettings.category_2 || 'Category 2']: evalData ? evalData.cat2_score : '-',
        [evalSettings.category_3 || 'Category 3']: evalData ? evalData.cat3_score : '-',
        [evalSettings.category_4 || 'Category 4']: evalData ? evalData.cat4_score : '-',
        'Total Score': evalData ? evalData.total_score : '-',
        'Updates Count': evalData ? (evalData.update_count || 0) : 0,
        'Evaluated By': evalData ? evalData.evaluated_by : '-'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Evaluations");
    XLSX.writeFile(workbook, "CodeStorm_Evaluations.xlsx");
  };

  const handleExportLogistics = () => {
    const rooms = Array.from(new Set(
      problemStatements
        .filter(ps => ps.presentation_day === logisticsDay && ps.room_number)
        .map(ps => ps.room_number)
    ));
    
    const exportData = rooms.map((room, index) => {
      const coord = coordinators.find(c => c.presentation_day === logisticsDay && c.room_number === room) || {};
      const psAssigned = problemStatements.filter(ps => ps.presentation_day === logisticsDay && ps.room_number === room).map(ps => ps.id).join(', ');
      
      return {
        'Sl No': index + 1,
        'Presentation Day': logisticsDay,
        'Room Number': room,
        'Assigned Problem Statements': psAssigned,
        'Faculty Coordinator': coord.faculty_coordinator || '-',
        'Student Coordinator': coord.student_coordinator || '-'
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logistics");
    XLSX.writeFile(workbook, `CodeStorm_Logistics_${logisticsDay.replace(/ /g, '_')}.xlsx`);
  };
"""

content = content.replace(
    """    XLSX.utils.book_append_sheet(workbook, worksheet, "Allocations");
    XLSX.writeFile(workbook, "CodeStorm_Allocations.xlsx");
  };""",
    """    XLSX.utils.book_append_sheet(workbook, worksheet, "Allocations");
    XLSX.writeFile(workbook, "CodeStorm_Allocations.xlsx");
  };\n""" + new_functions
)

# 2. Inject Button into Evaluations Tab
eval_button = """<button onClick={handleExportEvaluations} className="flex items-center justify-center gap-2 btn-secondary text-sm shrink-0"><Download size={16} /> Export to Excel</button>"""
content = content.replace(
    """<h2 className="text-xl font-bold text-white mb-6">Teams Evaluation</h2>""",
    """<div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Teams Evaluation</h2>""" + eval_button + """</div>"""
)

# 3. Inject Button into Logistics Tab
logistics_button = """<button onClick={handleExportLogistics} className="flex items-center justify-center gap-2 btn-secondary text-sm shrink-0"><Download size={16} /> Export to Excel</button>"""
# Wait, the logistics tab already has a flex container for the title and the day dropdown
# `<div className="flex justify-between items-center mb-6">\n                  <h2 className="text-xl font-bold text-white">Logistics & Coordinators</h2>\n                  <div className="flex flex-col w-full md:w-auto">`
content = content.replace(
    """<h2 className="text-xl font-bold text-white">Logistics & Coordinators</h2>
                  <div className="flex flex-col w-full md:w-auto">""",
    """<div className="flex items-center gap-4"><h2 className="text-xl font-bold text-white">Logistics & Coordinators</h2>""" + logistics_button + """</div>
                  <div className="flex flex-col w-full md:w-auto">"""
)


with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Export Logic.")
