# 数据来源:
#   - AozAction.csv          -> (key, ActionID, Rank)
#   - AozActionTransient.csv -> (key, Number, Icon, Stats, AozDescription)
#   - Action.csv             -> (ActionID, Name, Icon, Cast100ms, Recast100ms)
#   - ActionTransient.csv    -> (ActionID, Description)

import csv
import re
import os

BASE = r"D:\Github\ffxiv-datamining-hexcode-mixed\chs"
BLUBOOK_FILE = r"d:\GitHub\ff14-overlay-vue\src\pages\blubook.vue"

# ── 1. Read AozAction.csv ──
aoz_action = {}
with open(os.path.join(BASE, "AozAction.csv"), encoding="utf-8") as f:
    rows = list(csv.reader(f))
for row in rows[4:]:
    if not row or not row[0].strip():
        continue
    key = int(row[0])
    action_id = int(row[1]) if row[1] else 0
    rank = int(row[2]) if len(row) > 2 and row[2] else 0
    aoz_action[key] = {"ActionID": action_id, "Rank": rank}

# ── 2. Read AozActionTransient.csv ──
aoz_transient = {}
with open(os.path.join(BASE, "AozActionTransient.csv"), encoding="utf-8") as f:
    rows = list(csv.reader(f))
for row in rows[4:]:
    if not row or not row[0].strip():
        continue
    key = int(row[0])
    number = int(row[1]) if row[1] else 0
    icon = int(row[2]) if row[2] else 0
    stats = row[3] if len(row) > 3 else ""
    desc = row[4] if len(row) > 4 else ""
    aoz_transient[key] = {
        "Number": number,
        "Icon": icon,
        "Stats": stats,
        "AozDescription": desc,
    }

# ── 3. Read Action.csv ──
# Columns: row[1]=Name, row[3]=Icon, row[39]=Cast100ms, row[41]=Recast100ms
action_data = {}
with open(os.path.join(BASE, "Action.csv"), encoding="utf-8") as f:
    rows = list(csv.reader(f))
for row in rows[4:]:
    if not row or not row[0].strip():
        continue
    action_id = int(row[0])
    name = row[1] if len(row) > 1 else ""
    icon = int(row[3]) if len(row) > 3 and row[3] else 0
    cast100ms = int(row[39]) if len(row) > 39 and row[39] else 0
    recast100ms = int(row[41]) if len(row) > 41 and row[41] else 0
    action_data[action_id] = {
        "Name": name,
        "Icon": icon,
        "Cast100ms": cast100ms,
        "Recast100ms": recast100ms,
    }

# ── 4. Read ActionTransient.csv ──
action_transient = {}
with open(os.path.join(BASE, "ActionTransient.csv"), encoding="utf-8") as f:
    rows = list(csv.reader(f))
for row in rows[4:]:
    if not row or not row[0].strip():
        continue
    action_id = int(row[0])
    desc = row[1] if len(row) > 1 else ""
    action_transient[action_id] = desc

# ── 5. Extract existing Learn fields from blubook.vue ──
existing_learn = {}
with open(BLUBOOK_FILE, encoding="utf-8") as f:
    content = f.read()

# Find all Number/Learn pairs
number_pattern = re.compile(r"Number:\s*(\d+),")
learn_pattern = re.compile(r'Learn:\s*"((?:[^"\\]|\\.)*)"|Learn:\s*`((?:[^`\\]|\\.)*)`', re.DOTALL)
all_numbers = number_pattern.findall(content)

# For the Learn pattern, handle both " and ` template literals
# We'll parse more carefully
learn_values = []
# Find all Learn: "..." or Learn: `...` patterns
for m in re.finditer(r'Learn:\s*("[^"]*"|`[^`]*`)', content):
    val = m.group(1)
    # Remove the quotes/backticks
    if val.startswith('"') and val.endswith('"'):
        learn_values.append(val[1:-1])
    elif val.startswith('`') and val.endswith('`'):
        learn_values.append(val[1:-1])

if len(all_numbers) == len(learn_values):
    print(f"Parsed {len(all_numbers)} Number/Learn pairs successfully.")
    for n, l in zip(all_numbers, learn_values):
        existing_learn[n] = l
else:
    print(f"WARNING: Number count ({len(all_numbers)}) != Learn count ({len(learn_values)})")
    # Use the shorter length
    for n, l in zip(all_numbers[:min(len(all_numbers), len(learn_values))], learn_values[:min(len(all_numbers), len(learn_values))]):
        existing_learn[n] = l

# Also print some stats
print(f"Existing learn entries: {len(existing_learn)}")

# ── 6. Generate TypeScript ──
lines = []
lines.append("const aozActions: AozAction[] = [")

for key in sorted(aoz_action.keys()):
    if key == 0:
        continue

    aa = aoz_action[key]
    at = aoz_transient.get(key, {})
    ad = action_data.get(aa["ActionID"], {})

    number = at.get("Number", 0)
    name = ad.get("Name", "")
    icon_id = ad.get("Icon", 0)
    stats = at.get("Stats", "")
    description = action_transient.get(aa["ActionID"], "")
    aoz_desc = at.get("AozDescription", "")
    cast100ms = ad.get("Cast100ms", 0)
    recast100ms = ad.get("Recast100ms", 0)
    learn = existing_learn.get(str(number), "")

    lines.append("  {")
    lines.append(f"    ID: {key},")
    lines.append(f"    ActionID: {aa['ActionID']},")
    lines.append(f'    Name: "{name}",')
    lines.append(f"    Number: {number},")
    lines.append(f"    Stats: `{stats}`,")
    lines.append(f"    Cast100ms: {cast100ms},")
    lines.append(f"    Description: `{description}`,")
    lines.append(f"    AozDescription: `{aoz_desc}`,")
    lines.append(f"    Icon: `//cafemaker.wakingsands.com/i/${{completeIcon({icon_id})}}_hr1.png`,")
    lines.append(f"    Recast100ms: {recast100ms},")
    lines.append(f'    Learn: `{learn}`,')
    lines.append("  },")

lines.append("];")

output = "\n".join(lines)

output_file = os.path.join(os.path.dirname(__file__), "generated_blubook_data.txt")
with open(output_file, "w", encoding="utf-8") as f:
    f.write(output)

print(f"\nDone! Generated {len(aoz_action) - 1} actions.")
print(f"Saved to: {output_file}")
print(f"\n--- First 3 entries preview ---")
# Count the first 3 complete entries (each entry is from "  {" to "  },")
entry_count = 0
for line in output.split("\n"):
    print(line)
