import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

boundary = """            </motion.div>
          )}
</AnimatePresence>"""

new_boundary = """              </div>
              </div>
              </div>
            </motion.div>
          )}
</AnimatePresence>"""

content = content.replace(boundary, new_boundary)

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
