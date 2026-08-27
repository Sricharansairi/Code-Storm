import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# Pending Evaluation button
content = content.replace(
    "'bg-primary text-black hover:bg-primary/90'",
    "'bg-white/10 text-white hover:bg-white/20 border border-white/20'"
)

# Team status save button
content = content.replace(
    "'bg-primary hover:bg-primary-dark text-white'",
    "'bg-white/10 hover:bg-white/20 text-white border border-white/20'"
)

# Fix the ?? and other weird emojis I messed up in update_features.py
# (Wait, my previous script removed them, but wait... there was another ?? left maybe?)
content = content.replace('<div className="p-2 bg-primary/10 text-primary rounded-lg">??</div>', '')

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
