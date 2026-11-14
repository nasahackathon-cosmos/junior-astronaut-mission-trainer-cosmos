import json
import numpy as np
from pathlib import Path

# Project-relative paths
BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = BASE_DIR / "data/processed/mars_trek/jezero_terrain.json"
OUTPUT = BASE_DIR / "data/processed/mars_trek/jezero_slope.json"

with open(INPUT) as f:
    terrain = json.load(f)

elevation = np.array(terrain["elevations_m"], dtype=float)

# Mars radius in metres
mars_radius = 3389500

latitudes = np.array(terrain["latitudes"])
longitudes = np.array(terrain["longitudes"])

latitude_spacing = np.radians(abs(latitudes[1] - latitudes[0]))
longitude_spacing = np.radians(abs(longitudes[1] - longitudes[0]))

mean_latitude = np.radians(np.mean(latitudes))

dy = mars_radius * latitude_spacing
dx = mars_radius * np.cos(mean_latitude) * longitude_spacing

# Calculate elevation gradients
gradient_y, gradient_x = np.gradient(elevation, dy, dx)

# Calculate slope in degrees
slope = np.degrees(
    np.arctan(np.sqrt(gradient_x**2 + gradient_y**2))
)

result = {
    "name": terrain["name"],
    "source": "MOLA elevation dataset",
    "units": "degrees",
    "rows": int(slope.shape[0]),
    "columns": int(slope.shape[1]),
    "slope_degrees": np.round(slope, 3).tolist()
}

with open(OUTPUT, "w") as f:
    json.dump(result, f)

print("Slope calculation completed!")
print("Minimum slope:", round(float(np.min(slope)), 2), "degrees")
print("Maximum slope:", round(float(np.max(slope)), 2), "degrees")
print("Average slope:", round(float(np.mean(slope)), 2), "degrees")
print("Saved:", OUTPUT)
