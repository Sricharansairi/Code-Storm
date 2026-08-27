import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(650, 830):
    print(f"{i}: {lines[i].rstrip()}")
