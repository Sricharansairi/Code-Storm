with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
# Remove trailing empty lines and }
while lines and (lines[-1].strip() == '' or lines[-1].strip() == '}'):
    lines.pop()

# Add a single } back to close the function
lines.append('}\n')

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
