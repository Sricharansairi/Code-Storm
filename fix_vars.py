import sys

content = open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8').read()

content = content.replace("const [evalFilterRoom, setEvalFilterRoom] = useState('All');", "// const [evalFilterRoom, setEvalFilterRoom] = useState('All');")
content = content.replace("const handleDeleteMarks = async", "// const handleDeleteMarks = async")

open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8').write(content)
