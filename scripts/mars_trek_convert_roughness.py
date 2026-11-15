import json
from pathlib import Path
from osgeo import gdal
import numpy as np

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = BASE_DIR / "data/processed/mars_trek/jezero_roughness.tif"
OUTPUT = BASE_DIR / "data/processed/mars_trek/jezero_roughness.json"

dataset = gdal.Open(str(INPUT))

if dataset is None:
    raise RuntimeError("Could not open roughness TIFF")

# Read the three RGB bands
blue = dataset.GetRasterBand(3).ReadAsArray()
green = dataset.GetRasterBand(2).ReadAsArray()
red = dataset.GetRasterBand(1).ReadAsArray()

# Get geographic coordinates
transform = dataset.GetGeoTransform()

width = dataset.RasterXSize
height = dataset.RasterYSize

longitudes = [
    transform[0] + (col + 0.5) * transform[1]
    for col in range(width)
]

latitudes = [
    transform[3] + (row + 0.5) * transform[5]
    for row in range(height)
]

# Store roughness bands
result = {
    "name": "Jezero Crater MOLA Global Surface Roughness",
    "source": "MGS MOLA Global Surface Roughness",
    "units": "RGB intensity (0-255)",
    "dimensions": {
        "rows": height,
        "columns": width
    },
    "roughness_scales_km": {
        "blue": 0.6,
        "green": 2.4,
        "red": 9.2
    },
    "longitudes": longitudes,
    "latitudes": latitudes,
    "roughness": {
        "blue_0_6km": blue.tolist(),
        "green_2_4km": green.tolist(),
        "red_9_2km": red.tolist()
    }
}

with open(OUTPUT, "w") as f:
    json.dump(result, f)

print("Roughness conversion completed!")
print("Dimensions:", height, "x", width)
print("Saved:", OUTPUT)

