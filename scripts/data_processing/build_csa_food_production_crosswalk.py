import json
from pathlib import Path

OUTPUT = Path(
    "data/processed/missions/csa_food_production_crosswalk.json"
)

DATA_DIR = Path("data/processed/food_production")

DATASETS = [
    {
        "source_id": "CSA-CROP-REFERENCE",
        "file": "crop_reference.json",
        "title": "CSA Crop Reference",
    },
    {
        "source_id": "CSA-CROP-SELECTION",
        "file": "crop_selection_criteria.json",
        "title": "CSA Crop Selection Criteria",
    },
    {
        "source_id": "CSA-ISS-PLANT-SYSTEMS",
        "file": "iss_plant_growth_systems.json",
        "title": "ISS Plant Growth Systems",
    },
    {
        "source_id": "CSA-LUNAR-AGRICULTURE",
        "file": "lunar_agriculture_challenges.json",
        "title": "Lunar Agriculture Challenges",
    },
    {
        "source_id": "CSA-FARMING-METHODS",
        "file": "space_farming_methods.json",
        "title": "Space Farming Methods",
    },
    {
        "source_id": "CSA-SPACE-NUTRITION",
        "file": "space_food_nutrition.json",
        "title": "Space Food and Nutrition",
    },
    {
        "source_id": "CSA-WATER-MANAGEMENT",
        "file": "water_management.json",
        "title": "Space Water Management",
    },
]

def mapping(mission_id, source_ids, role, rationale, limitations=None):
    return {
        "mission_id": mission_id,
        "source_ids": source_ids,
        "evidence_role": role,
        "rationale": rationale,
        "limitations": limitations or [],
    }

plant_sources = [
    "CSA-CROP-REFERENCE",
    "CSA-CROP-SELECTION",
    "CSA-ISS-PLANT-SYSTEMS",
    "CSA-FARMING-METHODS",
]

mappings = []

for mission_id in ("M013", "M052", "M057", "M084"):
    mappings.append(mapping(
        mission_id,
        plant_sources,
        "direct_reference",
        "CSA crop and plant-growth references support the mission's "
        "plant-growth or greenhouse-planning learning activities.",
        [
            "These are educational references, not direct measurements "
            "of crop performance in lunar or Martian environments.",
            "Crop growth durations are reference values, not guaranteed "
            "mission outcomes.",
        ],
    ))

mappings.extend([
    mapping(
        "M047",
        [
            "CSA-WATER-MANAGEMENT",
            "CSA-LUNAR-AGRICULTURE",
        ],
        "direct_reference",
        "Water-recovery concepts and lunar water-availability challenges "
        "support the mission's water-allocation learning activity.",
        [
            "The references do not provide a numerical water-recovery rate.",
            "Any player water inventory or allocation values are simulated.",
        ],
    ),
    mapping(
        "M086",
        ["CSA-WATER-MANAGEMENT"],
        "supporting",
        "Supports the water-recovery and recycling portion of the mission.",
        [
            "Does not establish general waste sorting, waste processing, "
            "or overall waste-recycling efficiency.",
        ],
    ),
    mapping(
        "M016",
        [
            "CSA-ISS-PLANT-SYSTEMS",
            "CSA-CROP-SELECTION",
        ],
        "supporting",
        "Provides documented examples of plant-growth systems and "
        "experimental considerations.",
        [
            "Classroom experiments and player-controlled outcomes "
            "remain educational simulations.",
        ],
    ),
    mapping(
        "M018",
        ["CSA-SPACE-NUTRITION"],
        "background_only",
        "Provides background context for astronaut food requirements "
        "and nutrition.",
    ),
    mapping(
        "M058",
        ["CSA-SPACE-NUTRITION"],
        "background_only",
        "Provides background context for balanced food and dietary variety.",
    ),
    mapping(
        "M028",
        [
            "CSA-CROP-REFERENCE",
            "CSA-CROP-SELECTION",
            "CSA-LUNAR-AGRICULTURE",
        ],
        "optional",
        "Can provide an optional example for a collaborative crop-research "
        "activity; it is not a core mission mapping.",
    ),
])

document = {
    "title": "Junior Astronaut Mission Trainer — CSA Food Production Crosswalk",
    "version": "1.0",
    "source_organization": "Canadian Space Agency",
    "main_source": (
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/"
    ),
    "catalogue": "data/processed/missions/mission_catalog.json",
    "evidence_policy": {
        "direct_reference": (
            "A documented educational reference directly relevant to "
            "the mission's learning activity; not necessarily experimental evidence."
        ),
        "supporting": (
            "A useful supporting educational reference that does not "
            "directly measure the simulated mission outcome."
        ),
        "background_only": (
            "Contextual information for learning, not evidence for "
            "a simulated operational or health outcome."
        ),
        "optional": (
            "An optional reference that may be used in an activity "
            "but is not part of the core mission mapping."
        ),
    },
    "simulation_boundary": [
        "CSA educational references do not establish crop performance "
        "in lunar or Martian environments.",
        "Do not infer crop yields, water consumption, energy consumption, "
        "or nutritional sufficiency without supporting data.",
        "Do not invent numerical water-recovery rates.",
        "Player resource inventories, crop yields, and greenhouse outcomes "
        "must remain labelled as simulations.",
        "CSA water-recovery material does not establish general waste "
        "sorting or processing performance.",
    ],
    "sources": DATASETS,
    "mappings": mappings,
}

# Verify every referenced dataset exists and contains valid JSON records.
for source in document["sources"]:
    path = DATA_DIR / source["file"]
    if not path.is_file():
        raise FileNotFoundError(path)

    dataset = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(dataset.get("records"), list):
        raise ValueError(f"Missing records list in {path}")

# Write deterministic, readable JSON.
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(
    json.dumps(document, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

print(f"Created: {OUTPUT}")
print(f"Sources: {len(document['sources'])}")
print(f"Mappings: {len(document['mappings'])}")
print("Mapped missions:", ", ".join(
    item["mission_id"] for item in document["mappings"]
))
