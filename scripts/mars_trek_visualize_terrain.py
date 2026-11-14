
import json
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from matplotlib.colors import ListedColormap, BoundaryNorm
from matplotlib.patches import Patch

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = BASE_DIR / "data/processed/mars_trek/jezero_terrain_classification.json"
OUTPUT = BASE_DIR / "docs/visualizations/jezero_terrain_map.png"

# Load terrain classification
with open(INPUT) as f:
    data = json.load(f)

terrain = np.array(data["terrain_classes"])

# Convert categories into numeric values
class_values = {
    "flat": 0,
    "moderate": 1,
    "steep": 2
}

numeric_terrain = np.vectorize(class_values.get)(terrain)

# Define colours
cmap = ListedColormap([
    "#4CAF50",
    "#FFC107",
    "#E53935"
])

norm = BoundaryNorm([-0.5, 0.5, 1.5, 2.5], cmap.N)

# Create figure and axes
fig, ax = plt.subplots(figsize=(12, 8))

image = ax.imshow(
    numeric_terrain,
    cmap=cmap,
    norm=norm,
    interpolation="nearest",
    aspect="auto",
    origin="upper"
)

ax.set_title("Jezero Crater - MOLA Terrain Classification", fontsize=15)
ax.set_xlabel("Longitude grid index")
ax.set_ylabel("Latitude grid index")

# Create legend
legend_items = [
    Patch(facecolor="#4CAF50", label="Flat (0°–5°)"),
    Patch(facecolor="#FFC107", label="Moderate (>5°–15°)"),
    Patch(facecolor="#E53935", label="Steep (>15°)")
]

ax.legend(handles=legend_items, loc="upper right")

# Add colour bar to the correct axes
colorbar = fig.colorbar(image, ax=ax, ticks=[0, 1, 2])
colorbar.ax.set_yticklabels(["Flat", "Moderate", "Steep"])
colorbar.set_label("Terrain classification")

fig.tight_layout()

# Save image
fig.savefig(OUTPUT, dpi=300, bbox_inches="tight")
plt.close(fig)

print("Terrain visualization created successfully!")
print("Saved to:", OUTPUT)
