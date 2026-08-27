import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

content = re.sub(r'<motion\.div\s*\n\s*\n\s*className="card max-w-2xl mx-auto text-center py-12"\s*>', '<div className="card max-w-2xl mx-auto text-center py-12">', content)
content = re.sub(r'<motion\.div\s*\n\s*\n\s*className="space-y-6"\s*>', '<div className="space-y-6">', content)

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
