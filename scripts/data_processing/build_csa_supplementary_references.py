import json
from pathlib import Path

OUTPUT = Path("data/processed/food_production")
OUTPUT.mkdir(parents=True, exist_ok=True)

def save_json(filename, description, records):
    document = {
        "dataset": filename.removesuffix(".json"),
        "description": description,
        "source_organization": "Canadian Space Agency",
        "records": records,
    }

    path = OUTPUT / filename
    path.write_text(
        json.dumps(document, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Created: {path} ({len(records)} records)")


# 1. Water management
water = [
    {
        "system": "ISS water recovery system",
        "location": "International Space Station",
        "water_sources": [
            "urine",
            "sweat",
            "water_vapour_from_breath",
            "wash_water",
        ],
        "process": [
            "water_collection",
            "filtration",
            "water_recycling",
        ],
        "purpose": "Recover and reuse water for crew sustainability.",
        "relevance_to_deep_space": (
            "Water collection and filtration are essential for "
            "long-duration missions to the Moon and Mars."
        ),
        "quantitative_recovery_rate": None,
        "source": {
            "title": "The water cycle presented by David Saint-Jacques",
            "url": "https://www.asc-csa.gc.ca/eng/multimedia/search/video/18321",
            "source_type": "video_transcript",
            "source_date": "2019-06-07",
        },
    },
    {
        "system": "Natural water cycle",
        "process": [
            "evaporation",
            "cloud_formation",
            "precipitation",
            "surface_water_collection",
        ],
        "purpose": "Describe the natural recycling of water on Earth.",
        "space_application": (
            "The ISS uses an engineered system to replicate aspects "
            "of natural water recycling."
        ),
        "source": {
            "title": "The water cycle presented by David Saint-Jacques",
            "url": "https://www.asc-csa.gc.ca/eng/multimedia/search/video/18321",
            "source_type": "video_transcript",
            "source_date": "2019-06-07",
        },
    },
    {
        "system": "Lunar water availability",
        "location": "Moon",
        "challenge": "Liquid water is not readily available for agriculture.",
        "context": "Water ice has been identified on the Moon, but it is "
                   "not currently available in a form or quantity "
                   "sufficient for food production.",
        "source": {
            "title": "Space Brain Hack - Educator Guide",
            "url": "https://www.asc-csa.gc.ca/pdf/eng/youth-educators/objective-moon/space-brain-hack-educator-guide-2023-2024-v2.pdf",
            "source_type": "educational_pdf",
        },
    },
]

save_json(
    "water_management.json",
    "Water collection, recovery, recycling and availability "
    "for space missions.",
    water,
)


# 2. Space farming methods
methods = [
    {
        "method": "Hydroponics",
        "category": "soilless_cultivation",
        "description": (
            "A food production approach that grows plants without "
            "conventional soil, using a controlled growing system."
        ),
        "documented_application": {
            "project": "Naurvik",
            "location": "Gjoa Haven, Nunavut, Canada",
            "system": "Three converted shipping-container pods",
            "purpose": "Year-round fresh food production",
            "first_harvest": [
                "butter lettuce",
                "microgreens",
            ],
        },
        "source": {
            "title": "Naurvik project in Nunavut",
            "url": "https://www.asc-csa.gc.ca/eng/sciences/food-production/naurvik-project-in-nunavut.asp",
        },
    },
    {
        "method": "Controlled Environment Agriculture",
        "abbreviation": "CEA",
        "category": "controlled_environment_farming",
        "description": (
            "Growing food in an enclosed or semi-enclosed environment "
            "where conditions are managed to support crop production."
        ),
        "controlled_parameters": [
            "light",
            "temperature",
            "humidity",
        ],
        "purpose": "Support food production in harsh or remote environments.",
        "source": {
            "title": "Growing healthy food in space and in remote areas",
            "url": "https://www.asc-csa.gc.ca/eng/sciences/food-production/growing-healthy-food-in-space-and-remote-areas.asp",
        },
    },
    {
        "method": "Aeroponics",
        "category": "soilless_cultivation",
        "description": (
            "A potential alternative to conventional lunar soil-based "
            "plant cultivation."
        ),
        "documented_application": (
            "Identified as a potential growing approach in the "
            "Interplanetary Farming educational reference."
        ),
        "source": {
            "title": "Interplanetary Farming",
            "url": "https://www.asc-csa.gc.ca/eng/youth-educators/activities/fitness-and-nutrition/interplanetary-farming.asp",
            "source_page": 3,
        },
    },
    {
        "method": "Resource-efficient food production",
        "category": "advanced_food_production",
        "description": (
            "Developing food production technologies that minimize "
            "resource inputs while maximizing safe and nutritious food."
        ),
        "design_priorities": [
            "minimize_material_inputs",
            "minimize_energy_inputs",
            "minimize_water_inputs",
            "maximize_food_safety",
            "maximize_nutritional_value",
            "maximize_palatable_food_production",
        ],
        "related_initiative": "Deep Space Food Challenge",
        "source": {
            "title": "Deep Space Food Challenge",
            "url": "https://www.asc-csa.gc.ca/eng/sciences/food-production/deep-space-food-challenge.asp",
        },
    },
]

save_json(
    "space_farming_methods.json",
    "Space agriculture techniques, controlled growing environments "
    "and documented food production initiatives.",
    methods,
)


# 3. Space food nutrition
nutrition = [
    {
        "category": "daily_energy",
        "description": "Reported daily energy intake for astronauts.",
        "value": {
            "min": 1900,
            "max": 3200,
            "unit": "kcal/day",
        },
        "qualification": "Depends on individual crewmember requirements.",
        "source": {
            "title": "Eating in space",
            "url": "https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp",
        },
    },
    {
        "category": "nutritional_requirements",
        "requirements": [
            "balanced_diet",
            "adequate_nutrition",
            "food_variety",
        ],
        "purpose": "Maintain astronaut health during space missions.",
        "source": {
            "title": "Eating in space",
            "url": "https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp",
        },
    },
    {
        "category": "food_selection_criteria",
        "criteria": [
            "compact",
            "lightweight",
            "nutritious",
            "tasty",
            "minimal_crumbs",
            "shelf_stable",
        ],
        "explanation": (
            "Space food must fit spacecraft constraints, contribute "
            "to crew health, remain suitable throughout the mission "
            "and minimize floating crumbs."
        ),
        "source": {
            "title": "Eating in space",
            "url": "https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp",
        },
    },
    {
        "category": "food_preservation",
        "methods": [
            {
                "method": "fresh",
                "examples": ["fruits", "vegetables"],
            },
            {
                "method": "natural_form",
                "examples": ["nuts", "tortillas"],
            },
            {
                "method": "dried",
                "examples": ["dried fruit", "dried beef"],
            },
            {
                "method": "irradiated",
                "examples": ["chicken breast", "smoked turkey"],
            },
            {
                "method": "rehydratable",
                "examples": ["spinach", "juices", "beverages"],
            },
            {
                "method": "thermostabilized",
                "examples": ["tuna salads", "vanilla flan"],
            },
        ],
        "purpose": "Preserve food for spaceflight missions.",
        "source": {
            "title": "Eating in space",
            "url": "https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp",
        },
    },
    {
        "category": "psychological_wellbeing",
        "factors": [
            "food_variety",
            "food_quality",
            "food_quantity",
            "cultural_food_preferences",
        ],
        "purpose": (
            "Support crew morale, appetite and overall well-being "
            "during isolated missions."
        ),
        "source": {
            "title": "Eating in space",
            "url": "https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/eating-in-space.asp",
        },
    },
]

save_json(
    "space_food_nutrition.json",
    "Astronaut dietary energy, nutritional considerations, "
    "food selection and preservation.",
    nutrition,
)

print("\nAll three supplementary CSA JSON files generated.")
