
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DATA = BASE / "data" / "processed" / "mars_trek"


def load(filename):
    with open(DATA / filename) as f:
        return json.load(f)


# Load all datasets
elevation = load("jezero_terrain.json")
slope = load("jezero_slope.json")
classification = load("jezero_terrain_classification.json")
roughness = load("jezero_roughness.json")
thermal = load("jezero_thermal_inertia.json")
dust = load("jezero_tes_dust.json")


rows = elevation["rows"]
columns = elevation["columns"]


# Check dimensions of datasets with rows/columns at root level
for name, dataset in [
    ("Slope", slope),
    ("Classification", classification)
]:
    if (dataset["rows"], dataset["columns"]) != (rows, columns):
        raise ValueError(f"{name} dimensions do not match")


# Check dimensions of datasets with nested dimensions
for name, dataset in [
    ("Roughness", roughness),
    ("Thermal Inertia", thermal),
    ("TES Dust", dust)
]:
    if (
        dataset["dimensions"]["rows"],
        dataset["dimensions"]["columns"]
    ) != (rows, columns):
        raise ValueError(f"{name} dimensions do not match")


# Check coordinate alignment
for name, dataset in [
    ("Classification", classification),
    ("Roughness", roughness),
    ("Thermal Inertia", thermal),
    ("TES Dust", dust)
]:
    for a, b in zip(elevation["latitudes"], dataset["latitudes"]):
        if not math.isclose(a, b, abs_tol=1e-6):
            raise ValueError(f"{name} latitude mismatch")

    for a, b in zip(elevation["longitudes"], dataset["longitudes"]):
        if not math.isclose(a, b, abs_tol=1e-6):
            raise ValueError(f"{name} longitude mismatch")


# Combine all datasets
combined = {
    "name": "Jezero Crater Combined Terrain and Environmental Dataset",

    "source": [
        "MGS MOLA elevation",
        "MGS MOLA global surface roughness",
        "MGS TES global thermal inertia",
        "MGS TES global dust"
    ],

    "rows": rows,
    "columns": columns,

    "latitudes": elevation["latitudes"],
    "longitudes": elevation["longitudes"],

    "elevations_m": elevation["elevations_m"],

    "slope_degrees": slope["slope_degrees"],

    "terrain_classes": classification["terrain_classes"],

    "roughness": roughness["roughness"],
    "roughness_scales_km": roughness["roughness_scales_km"],

    "thermal_inertia_map": thermal["thermal_inertia_map"],
    "thermal_inertia_data_type": thermal["data_type"],
    "thermal_inertia_units": thermal["units"],

    "dust_map": dust["dust_map"],
    "dust_data_type": dust["data_type"],
    "dust_units": dust["units"],

    "classification_thresholds_degrees":
        classification["thresholds_degrees"],

    "classification_summary": classification["summary"]
}


# Save combined dataset
output = DATA / "jezero_combined_terrain.json"

with open(output, "w") as f:
    json.dump(combined, f)


print("Combined terrain dataset created successfully!")
print("Dimensions:", rows, "x", columns)
print(
    "Includes elevation, slope, classification, "
    "roughness, thermal inertia and TES dust."
)
print("Saved:", output)
