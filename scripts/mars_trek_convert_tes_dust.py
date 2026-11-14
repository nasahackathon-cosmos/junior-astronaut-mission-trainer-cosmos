
import json
from pathlib import Path
from osgeo import gdal

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = BASE_DIR / "data/processed/mars_trek/jezero_tes_dust.tif"
OUTPUT = BASE_DIR / "data/processed/mars_trek/jezero_tes_dust.json"

dataset = gdal.Open(str(INPUT))

if dataset is None:
    raise RuntimeError("Could not open TES Dust TIFF")

# Read RGB bands
red = dataset.GetRasterBand(1).ReadAsArray()
green = dataset.GetRasterBand(2).ReadAsArray()
blue = dataset.GetRasterBand(3).ReadAsArray()

# Geographic coordinates
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

result = {
    "name": "Jezero TES Global Dust Map",
    "source": "MGS TES Global Dust",
    "data_type": "RGB colorized map",
    "units": "RGB intensity (0-255); not calibrated dust concentration",
    "dimensions": {
        "rows": height,
        "columns": width
    },
    "longitudes": longitudes,
    "latitudes": latitudes,
    "dust_map": {
        "red": red.tolist(),
        "green": green.tolist(),
        "blue": blue.tolist()
    }
}

with open(OUTPUT, "w") as f:
    json.dump(result, f)

print("TES Dust conversion completed!")
print("Dimensions:", height, "x", width)
print("Saved:", OUTPUT)
