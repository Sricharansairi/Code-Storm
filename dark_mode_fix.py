import sys
import re

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

# Nav bar
content = content.replace(
    'className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4"',
    'className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4"'
)
content = content.replace(
    'className="flex bg-gray-100 p-1 rounded-lg"',
    'className="flex bg-black/40 p-1 rounded-lg border border-white/10"'
)

# Nav Tabs
for tab in ['dashboard', 'upload', 'settings', 'evaluations']:
    content = content.replace(
        f"`px-4 py-2 text-sm font-medium rounded-md transition-all ${{activeTab === '{tab}' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}}`",
        f"`px-4 py-2 text-sm font-medium rounded-md transition-all ${{activeTab === '{tab}' ? 'bg-white/10 text-primary shadow-sm border border-white/10' : 'text-gray-400 hover:text-white'}}`"
    )

# Nav Right side
content = content.replace(
    'className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 hidden lg:flex cursor-pointer hover:bg-gray-50 transition-colors"',
    'className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 hidden lg:flex cursor-pointer hover:bg-white/10 transition-colors"'
)
content = content.replace(
    'className="text-xs font-medium text-gray-700"',
    'className="text-xs font-medium text-white"'
)
content = content.replace(
    'className="text-sm border border-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-white transition-colors"',
    'className="text-sm border border-white/10 text-white px-4 py-2 rounded-md hover:bg-white/10 transition-colors"'
)
content = content.replace(
    'className="text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-white/10"',
    'className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"'
)

# Filters div
content = content.replace(
    'className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 items-end"',
    'className="bg-black/30 backdrop-blur-xl p-4 rounded-lg shadow-sm border border-white/10 mb-6 flex flex-col sm:flex-row gap-4 items-end"'
)
content = content.replace(
    'className="text-sm font-medium text-gray-700"',
    'className="text-sm font-medium text-white"'
)
content = content.replace(
    'className="text-xs text-gray-500 mb-1"',
    'className="text-xs text-gray-300 mb-1"'
)

# Select dropdowns
content = re.sub(
    r'className="text-sm border-gray-200 rounded-md bg-white border py\.1\.5 px-2 focus:ring-primary focus:border-primary( max-w-\[150px\])?"',
    r'className="text-sm border-white/20 rounded-md bg-black/30 backdrop-blur-xl border py-1.5 px-2 focus:ring-primary focus:border-primary text-white\1"',
    content
)

# Problem Statements card
content = content.replace(
    'className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col h-full"',
    'className="card p-0 flex flex-col h-full"'
)
content = content.replace(
    'className="p-4 border-b border-gray-100 bg-white"',
    'className="p-4 border-b border-white/10 bg-black/20"'
)
content = content.replace(
    'className="p-4 flex items-center justify-between hover:bg-white"',
    'className="p-4 flex items-center justify-between hover:bg-white/5 border-b border-white/5 last:border-0"'
)
content = content.replace(
    'className="p-2 text-gray-500 hover:text-primary transition-colors bg-white border border-gray-100 rounded"',
    'className="p-2 text-gray-400 hover:text-primary transition-colors bg-black/40 border border-white/10 rounded hover:bg-white/10"'
)
content = content.replace(
    'className="p-2 text-gray-500 hover:text-red-400 transition-colors bg-white border border-gray-100 rounded"',
    'className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-black/40 border border-white/10 rounded hover:bg-white/10"'
)

# Modal Edit PS
content = content.replace(
    'className="card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-white"',
    'className="card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"'
)
content = content.replace(
    'className="px-6 py-4 border-b border-gray-100 flex justify-between items-center"',
    'className="px-6 py-4 border-b border-white/10 flex justify-between items-center"'
)
content = content.replace(
    'className="text-lg font-bold text-gray-900"',
    'className="text-lg font-bold text-white"'
)

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
