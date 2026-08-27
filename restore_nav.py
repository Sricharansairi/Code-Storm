import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

old_nav_settings = """              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Settings
              </button>
            </div>"""

new_nav_evaluations = """              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Settings
              </button>
              <button 
                onClick={() => setActiveTab('evaluations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'evaluations' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Evaluations
              </button>
            </div>"""

content = content.replace(old_nav_settings, new_nav_evaluations)

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
