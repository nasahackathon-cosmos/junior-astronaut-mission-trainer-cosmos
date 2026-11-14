
import json
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

SLOPE_INPUT = BASE_DIR / "data/processed/mars_trek/jezero_slope.json"
TERRAIN_INPUT = BASE_DIR / "data/processed/mars_trek/jezero_terrain.json"
OUTPUT = BASE_DIR / "data/processed/mars_trek/jezero_terrain_classification.json"

# Load slope data
with open(SLOPE_INPUT) as f:
    slope_data = json.load(f)

# Load elevation data for coordinates
with open(TERRAIN_INPUT) as f:
    terrain_data = json.load(f)

slope = np.array(slope_data["slope_degrees"], dtype=float)

# Validate dimensions and values
if slope.shape != (terrain_data["rows"], terrain_data["columns"]):
    raise ValueError("Grid dimensions do not match")

if not np.isfinite(slope).all():
    raise ValueError("Slope data contains invalid values")

if np.any(slope < 0):
    raise ValueError("Slope data contains negative values")

# Classify terrain
classification = np.full(slope.shape, "flat", dtype=object)
classification[(slope > 5) & (slope <= 15)] = "moderate"
classification[slope > 15] = "steep"

# Calculate category statistics
unique, counts = np.unique(classification, return_counts=True)
total = classification.size

summary = {}

for category, count in zip(unique, counts):
    summary[category] = {
        "grid_points": int(count),
        "percentage": round(float(count / total * 100), 2)
    }

# Prepare result
result = {
    "name": terrain_data["name"],
    "source": terrain_data["source"],
    "rows": int(classification.shape[0]),
    "columns": int(classification.shape[1]),
    "classification_method": "Slope-based",
    "thresholds_degrees": {
        "flat": "0 to 5",
        "moderate": "above 5 to 15",
        "steep": "above 15"
    },
    "latitudes": terrain_data["latitudes"],
    "longitudes": terrain_data["longitudes"],
    "terrain_classes": classification.tolist(),
    "summary": summary
}

# Save result
with open(OUTPUT, "w") as f:
    json.dump(result, f)

print("Terrain classification completed!")
print("Output:", OUTPUT)
print("Grid shape:", classification.shape)

for category, values in summary.items():
    print(
        f"{category.title()}: "
        f"{values['grid_points']} points "
        f"({values['percentage']}%)"
    )
