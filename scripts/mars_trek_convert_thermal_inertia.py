
import json
from pathlib import Path
from osgeo import gdal

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = BASE_DIR / "data/processed/mars_trek/jezero_thermal_inertia.tif"
OUTPUT = BASE_DIR / "data/processed/mars_trek/jezero_thermal_inertia.json"

dataset = gdal.Open(str(INPUT))

if dataset is None:
    raise RuntimeError("Could not open Thermal Inertia TIFF")

# Read RGB bands
red = dataset.GetRasterBand(1).ReadAsArray()
green = dataset.GetRasterBand(2).ReadAsArray()
blue = dataset.GetRasterBand(3).ReadAsArray()

# Read alpha band (validity/transparency information)
alpha = dataset.GetRasterBand(4).ReadAsArray()

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

# Store Thermal Inertia map information
result = {
    "name": "Jezero TES Thermal Inertia",
    "source": "MGS TES Global Thermal Inertia",
    "data_type": "RGB colorized map",
    "units": "RGB intensity (0-255); not calibrated physical values",
    "dimensions": {
        "rows": height,
        "columns": width
    },
    "longitudes": longitudes,
    "latitudes": latitudes,
    "thermal_inertia_map": {
        "red": red.tolist(),
        "green": green.tolist(),
        "blue": blue.tolist(),
        "alpha": alpha.tolist()
    }
}

with open(OUTPUT, "w") as f:
    json.dump(result, f)

print("Thermal Inertia conversion completed!")
print("Dimensions:", height, "x", width)
print("Saved:", OUTPUT)

