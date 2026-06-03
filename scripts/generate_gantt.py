import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

tasks = [
    ("Idea Finalization",              100, "Completed",   1, 1),
    ("Problem Research & SDG Mapping", 30,  "Completed",   1, 1.5),
    ("Market & Competitor Analysis",   40,  "Not Started", 1.5, 2.5),
    ("Requirement Gathering",          60,  "Started",     1, 2),
    ("System Design (UI/UX)",          100, "Started",     2, 4),
    ("Database Design",                10,  "Not Started", 2, 3),
    ("Video Presentation",            0,   "Not Started", 7, 8),
    ("Frontend Development",           100, "Started",     2, 5),
    ("Backend Development",            90,  "Not Started", 3, 6),
    ("AI Integration",                 0,   "Not Started", 3, 5),
    ("Testing & Debugging",            70,  "Not Started", 5, 7),
    ("Deployment",                     0,   "Not Started", 6, 7),
    ("User Feedback Collection",       5,   "Not Started", 6, 8),
    ("Improvement & Optimization",     0,   "Not Started", 7, 8),
    ("Documentation",                  0,   "Not Started", 5, 7),
    ("Customer Support / Maintenance", 0,   "Not Started", 7, 8),
]

status_colors = {
    "Completed":   "#22c55e",
    "Started":     "#3b82f6",
    "Not Started": "#f43f5e",
}

progress_colors = {
    "Completed":   "#16a34a",
    "Started":     "#2563eb",
    "Not Started": "#e11d48",
}

fig, ax = plt.subplots(figsize=(16, 9))
fig.patch.set_facecolor('#0a0a0a')
ax.set_facecolor('#0a0a0a')

n = len(tasks)
bar_height = 0.6

for i, (name, progress, status, start, end) in enumerate(tasks):
    y = n - 1 - i
    duration = end - start
    color = status_colors.get(status, "#6b7280")
    prog_color = progress_colors.get(status, "#4b5563")

    # Background bar (full duration)
    ax.barh(y, duration, left=start, height=bar_height,
            color=color, alpha=0.2, edgecolor=color, linewidth=0.8)

    # Progress fill
    if progress > 0:
        filled = duration * (progress / 100)
        ax.barh(y, filled, left=start, height=bar_height,
                color=color, alpha=0.75, edgecolor='none')

    # Progress % text
    mid_x = start + duration / 2
    ax.text(mid_x, y, f"{progress}%", ha='center', va='center',
            fontsize=7.5, color='white', fontweight='bold')

# Y axis - task names
ax.set_yticks(range(n))
ax.set_yticklabels([t[0] for t in reversed(tasks)], fontsize=9, color='#d4d4d4', fontfamily='sans-serif')

# X axis - weeks
ax.set_xticks(range(1, 9))
ax.set_xticklabels([f"Week {i}" for i in range(1, 9)], fontsize=9, color='#a3a3a3')
ax.set_xlim(0.5, 8.5)

# Grid
for x in range(1, 9):
    ax.axvline(x, color='#262626', linewidth=0.5, linestyle='-')
for y in range(n):
    ax.axhline(y - 0.4, color='#1a1a1a', linewidth=0.5)

# Spines
for spine in ax.spines.values():
    spine.set_visible(False)

ax.tick_params(axis='both', which='both', length=0)
ax.tick_params(axis='x', pad=8)
ax.tick_params(axis='y', pad=10)

# Title
ax.set_title("StayNep AI Voice Receptionist — Project Gantt Chart",
             fontsize=15, color='white', fontweight='bold', pad=20)

# Legend
legend_items = [
    mpatches.Patch(facecolor="#22c55e", alpha=0.75, label="Completed"),
    mpatches.Patch(facecolor="#3b82f6", alpha=0.75, label="Started"),
    mpatches.Patch(facecolor="#f43f5e", alpha=0.75, label="Not Started"),
    mpatches.Patch(facecolor='white', alpha=0.15, edgecolor='white', linewidth=0.8, label="Remaining"),
]
legend = ax.legend(handles=legend_items, loc='upper right', fontsize=8,
                   facecolor='#141414', edgecolor='#333333', labelcolor='#d4d4d4',
                   framealpha=0.9)

plt.tight_layout()
output = '/Users/prabinsharma/Desktop/StayNep_Gantt_Chart.png'
plt.savefig(output, dpi=200, bbox_inches='tight', facecolor='#0a0a0a')
plt.close()
print(f"Saved to: {output}")
