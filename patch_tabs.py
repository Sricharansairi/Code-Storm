import sys
import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# 1. Close the Settings part early? No, we want Certificates and Logistics INSIDE Settings.
# The Settings block ends at:
#             </motion.div>
#           )}
#
#           {activeTab === 'certificates' && (

# Replace the boundary between settings and certificates
boundary_1 = """            </motion.div>
          )}

          {activeTab === 'certificates' && ("""
new_boundary_1 = """              <div className="mt-12 border-t border-gray-100/10 pt-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><div className="p-2 bg-primary/10 text-primary rounded-lg">📋</div> Certificates & Awards</h2>"""
content = content.replace(boundary_1, new_boundary_1)

# Replace the boundary between certificates and logistics
boundary_2 = """            </motion.div>
          )}

          {activeTab === 'logistics' && ("""
new_boundary_2 = """              </div>
              <div className="mt-12 border-t border-gray-100/10 pt-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><div className="p-2 bg-primary/10 text-primary rounded-lg">🏫</div> Room & Logistics</h2>"""
content = content.replace(boundary_2, new_boundary_2)

# Change the motion.div of Certificates and Logistics into regular divs since they are now inside the settings motion.div
content = content.replace('key="certificates"\n              initial={{ opacity: 0, y: 20 }}\n              animate={{ opacity: 1, y: 0 }}\n              exit={{ opacity: 0, y: -20 }}\n              transition={{ duration: 0.3, ease: "circOut" }}', '')
content = content.replace('key="logistics"\n              initial={{ opacity: 0, y: 20 }}\n              animate={{ opacity: 1, y: 0 }}\n              exit={{ opacity: 0, y: -20 }}\n              transition={{ duration: 0.3, ease: "circOut" }}', '')
content = content.replace('<motion.div \n              \n              className="space-y-8"\n            >', '<div className="space-y-8">')

# Close the new divs at the very end
boundary_end = """            </motion.div>
          )}

        </main>"""
# Actually wait, the last one ends with `</motion.div>\n          )}`
# Let's replace the last one.
new_boundary_end = """              </div>
            </motion.div>
          )}

        </main>"""
content = content.replace(boundary_end, new_boundary_end)

# Remove certificates and logistics from the nav bar!
nav_ToRemove = """              <button 
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
content = content.replace(nav_ToRemove, "")


open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
print("Applied UI fixes.")
