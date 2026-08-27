import re
import sys

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update activeTab state
content = re.sub(
    r"const \[activeTab, setActiveTab\] = useState<.*?>\('dashboard'\);",
    "const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'settings' | 'evaluations' | 'certificates'>('dashboard');",
    content
)

# 2. Add Evaluation States right after metrics state
eval_states = """
  // Evaluation States
  const [evalSettings, setEvalSettings] = useState<any>({ category_1: 'Innovation', category_2: 'Feasibility', category_3: 'Presentation', category_4: 'Technicality' });
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [evalFilterPS, setEvalFilterPS] = useState('All');
  const [evalFilterDay, setEvalFilterDay] = useState('All');
  const [evalFilterRoom, setEvalFilterRoom] = useState('All');
  const [evalFilterStatus, setEvalFilterStatus] = useState('All');
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [teamToEvaluate, setTeamToEvaluate] = useState<any>(null);
  const [evalScores, setEvalScores] = useState({ cat1: 0, cat2: 0, cat3: 0, cat4: 0 });
  const [savingEval, setSavingEval] = useState(false);

  const fetchEvalData = async () => {
    try {
      const { data: settings } = await supabase.from('evaluation_settings').select('*').single();
      if (settings) setEvalSettings(settings);
      const { data: evals } = await supabase.from('evaluations').select('*');
      if (evals) setEvaluations(evals);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvalData();
  }, []);
"""
content = content.replace(
    "const [metrics, setMetrics] = useState({ total: 0, allocated: 0, popular: '-' });",
    "const [metrics, setMetrics] = useState({ total: 0, allocated: 0, popular: '-' });\n" + eval_states
)

# 3. Add Evaluation Tabs to Nav
nav_tabs = """              <button 
                onClick={() => setActiveTab('evaluations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'evaluations' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Evaluations
              </button>
              <button 
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'certificates' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Certificates
              </button>
"""
content = content.replace(
    """              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Settings
              </button>""",
    """              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Settings
              </button>\n""" + nav_tabs
)

# 4. Modify 'modalPS' so it captures presentation_day and room_number
content = content.replace(
    "const [modalPS, setModalPS] = useState<any>(null);",
    "const [modalPS, setModalPS] = useState<any>({ presentation_day: '31st August', room_number: '' });"
)

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected state and nav tabs.")
