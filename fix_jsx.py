import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# Replace <motion.div ...> that was left over
# The one for certificates:
content = re.sub(
    r'<motion.div\s+key="certificates"\s+initial=[\s\S]*?className="space-y-8"\s+>',
    '<div className="space-y-8">',
    content
)

# The one for logistics:
content = re.sub(
    r'<motion.div\s+key="logistics"\s+initial=[\s\S]*?className="space-y-6"\s+>',
    '<div className="space-y-6">',
    content
)

# I also noticed the python script removed `key="certificates"...` separately but left `<motion.div`. 
# Let's just catch `<motion.div\n              \n              className="space-y-6"\n            >` etc.
content = re.sub(r'<motion\.div\s*\n\s*\n\s*className="space-y-6"\s*>', '<div className="space-y-6">', content)
content = re.sub(r'<motion\.div\s*\n\s*\n\s*className="space-y-8"\s*>', '<div className="space-y-8">', content)

# But what about the closing tags? 
# At line 1050:
#                 </div>
#               </div>
#             </motion.div>
#           )}
# </AnimatePresence>
#       </main>
# This corresponds to the `settings` tab, which starts at line 697.
# `{activeTab === 'settings' && (`
# Wait! `{activeTab === 'evaluations' && (` starts at some point and it might have lost its closing tags?
# Wait! I will just use `prettier` or standard tools if they can format it? No, syntax errors cannot be formatted.

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
