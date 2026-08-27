import sys
import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# Select dropdowns fix
content = re.sub(
    r'className="text-sm border-gray-200 rounded-md bg-white border py-1\.5 px-2 focus:ring-primary focus:border-primary( max-w-\[150px\])?"',
    r'className="text-sm border-white/20 rounded-md bg-black/40 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary text-white\1"',
    content
)

# Upload Area hover
content = content.replace(
    'className="border-2 border-dashed border-white/15 rounded-xl p-12 text-center hover:bg-white transition-colors"',
    'className="border-2 border-dashed border-white/15 rounded-xl p-12 text-center hover:bg-white/5 transition-colors"'
)

# Line 1127 (Logistics room assignments list)
content = content.replace(
    'className="flex items-center gap-3 text-sm text-gray-200 bg-white px-4 py-2.5 rounded-lg border border-gray-100"',
    'className="flex items-center gap-3 text-sm text-gray-200 bg-black/40 px-4 py-2.5 rounded-lg border border-white/10"'
)

# Ensure no other weird grey text remains in Logistics or certificates
content = content.replace('text-gray-700', 'text-gray-300')
content = content.replace('text-gray-900', 'text-white')
content = content.replace('border-gray-100', 'border-white/10')
content = content.replace('border-gray-200', 'border-white/20')
content = content.replace('bg-gray-50', 'bg-white/5')

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
