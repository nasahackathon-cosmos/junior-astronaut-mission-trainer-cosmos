
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

catalog_path = ROOT / "data/processed/missions/mission_catalog.json"
output_path = ROOT / "data/processed/missions/mola_mission_mapping.json"

with open(catalog_path, encoding="utf-8") as f:
    catalog = json.load(f)

missions = {
    "M009": {
        "role": "Mars landing-site learning",
        "datasets": ["jezero_terrain.json", "jezero_slope.json",
                     "jezero_terrain_classification.json"],
        "usage": "Compare candidate locations within the Jezero data coverage using elevation and slope.",
        "limitation": "Only supports Mars locations inside the extracted Jezero region. Landing safety is not certified."
    },
    "M014": {
        "role": "Rover and crater exploration",
        "datasets": ["jezero_terrain.json", "jezero_terrain_classification.json"],
        "usage": "Explore Jezero elevation and broad terrain variation alongside real imagery.",
        "limitation": "MOLA does not identify individual rocks, rover hardware or small obstacles."
    },
    "M040": {
        "role": "Rover route planning",
        "datasets": ["jezero_slope.json", "jezero_terrain_classification.json"],
        "usage": "Compare route segments inside Jezero using terrain slope categories.",
        "limitation": "Route planning is a simulation, not certified rover navigation. MOLA does not measure small-scale roughness."
    },
    "M042": {
        "role": "Jezero crater exploration",
        "datasets": ["jezero_terrain.json", "jezero_slope.json"],
        "usage": "Visualize Jezero elevation and slope as part of the crater exploration activity.",
        "limitation": "Use imagery and geological evidence separately to teach about ancient water."
    },
    "M044": {
        "role": "Mars base-location comparison",
        "datasets": ["jezero_terrain.json", "jezero_slope.json",
                     "jezero_terrain_classification.json"],
        "usage": "Compare possible base locations within Jezero using elevation and slope.",
        "limitation": "This is a simplified game score, not a complete habitat suitability assessment."
    },
    "M072": {
        "role": "Hazard-aware rover routes",
        "datasets": ["jezero_slope.json", "jezero_terrain_classification.json"],
        "usage": "Compare two routes within Jezero using slope indicators.",
        "limitation": "Risk scores are game calculations. MOLA does not provide small-scale roughness or failure probabilities."
    },
    "M077": {
        "role": "Terrain-aware rover navigation",
        "datasets": ["jezero_terrain.json", "jezero_slope.json",
                     "jezero_terrain_classification.json"],
        "usage": "Plan a simulated route between two points inside Jezero coverage.",
        "limitation": "A simulated route is not an actual rover command or certified safe path."
    },
    "M078": {
        "role": "Lost-sample search",
        "datasets": ["jezero_terrain.json", "jezero_slope.json"],
        "usage": "Provide terrain context for a fictional search area and return route inside Jezero coverage.",
        "limitation": "The rover position and sample are fictional scenario data, not NASA telemetry."
    },
    "M094": {
        "role": "Ancient water evidence exploration",
        "datasets": ["jezero_terrain.json", "jezero_slope.json"],
        "usage": "Explore the broad Jezero landscape alongside rover imagery and geological evidence.",
        "limitation": "Elevation alone does not prove ancient water or evidence of life."
    },
    "M096": {
        "role": "Mars space-camp location selection",
        "datasets": ["jezero_terrain.json", "jezero_terrain_classification.json"],
        "usage": "Compare two or three locations inside Jezero using flat, moderate and steep terrain classes.",
        "limitation": "The best-place score is a simplified learning activity, not an official NASA site-selection decision."
    }
}

catalogue = {
    m["mission_id"]: m for m in catalog["missions"]
}

mapping = []

for mission_id, details in missions.items():
    if mission_id not in catalogue:
        raise ValueError(f"Mission {mission_id} not found in catalogue")

    mapping.append({
        "mission_id": mission_id,
        "title": catalogue[mission_id]["title"],
        **details,
        "data_type": "Derived from real Mars MOLA elevation measurements"
    })

result = {
    "module": "MOLA Jezero Terrain Module",
    "source": "NASA Mars Global Surveyor MOLA",
    "region": "Jezero Crater, Mars",
    "coverage": {
        "longitude_approx": [76.5, 78.5],
        "latitude_approx": [17.5, 19.8]
    },
    "terrain_categories": {
        "flat": "0 to 5 degrees",
        "moderate": "greater than 5 to 15 degrees",
        "steep": "greater than 15 degrees"
    },
    "limitations": [
        "Regional terrain data, not small-obstacle detection",
        "Slope values are calculated estimates",
        "Mission game scores and rover movement are simulations",
        "This dataset does not provide lunar terrain"
    ],
    "mission_count": len(mapping),
    "missions": mapping
}

output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)

print(f"Created: {output_path}")
print(f"Mapped missions: {len(mapping)}")

for item in mapping:
    print(item["mission_id"], "-", item["title"])
