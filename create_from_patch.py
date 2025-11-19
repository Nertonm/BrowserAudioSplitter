# create_from_patch.py
import sys, os, re

if len(sys.argv) != 2:
    print("Usage: python3 create_from_patch.py patch.diff")
    sys.exit(1)

data = open(sys.argv[1], encoding='utf-8').read()
parts = re.split(r'\*\*\* Begin Patch', data)
for p in parts:
    m = re.search(r'\*\*\* Add File:\s*(.+?)\r?\n', p)
    if not m: 
        continue
    fname = m.group(1).strip()
    em = re.search(r'\r?\n(.*?)(?:\r?\n)?\*\*\* End Patch', p, flags=re.S)
    if not em:
        print("No content for", fname)
        continue
    content = em.group(1)
    os.makedirs(os.path.dirname(fname) or '.', exist_ok=True)
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Wrote", fname)