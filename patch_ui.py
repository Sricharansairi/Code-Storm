import sys
import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# 1. Update button styling: remove `bg-primary text-white hover:bg-primary/90` and replace with glassmorphism `bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10`
content = content.replace("bg-primary text-white hover:bg-primary/90", "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10")
# some buttons might be bg-primary/90 or bg-primary hover:bg-primary/80
content = content.replace("bg-primary hover:bg-primary/90 text-white", "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10")

# 2. Re-arrange the nav tabs: we want to keep Evaluations, but Certificates should be inside Settings. 
# Also remove Logistics from nav (if it's there).
# Looking at inject1.py and inject_coordinators.py, Logistics was added.
old_nav = """              <button 
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
              <button 
                onClick={() => setActiveTab('logistics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'logistics' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Logistics
              </button>"""
new_nav = """              <button 
                onClick={() => setActiveTab('evaluations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'evaluations' ? 'bg-black/30 backdrop-blur-xl text-primary shadow-sm' : 'text-gray-300 hover:text-white'}`}
              >
                Evaluations
              </button>"""
content = content.replace(old_nav, new_nav)

# 3. Add Logistics and Certificates to the Settings tab.
# Wait, the Settings tab currently has `Evaluation Settings`. Let's just find the Settings tab block and inject Certificates there.
# Since we might not be sure of the exact layout of the Settings tab, we can leave the `activeTab === 'certificates'` block where it is, and just rename the nav?
# The user said: "remove that logistics option and place add certificates pages also, just make sure add them into the settings option itself"
# This probably means the Settings tab should have sub-sections or just stack them.
# The `activeTab === 'settings'` has a div. We can just move the contents of Certificates and Logistics into Settings!

settings_tab_start = "{activeTab === 'settings' && ("
settings_tab_end = "        </div>" # Just guessing the end is hard. 

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
