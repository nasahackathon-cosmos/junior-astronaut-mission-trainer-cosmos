import json
from pathlib import Path

OUTPUT = Path("data/processed/food_production")
OUTPUT.mkdir(parents=True, exist_ok=True)

SOURCE = {
    "title": "Interplanetary Farming",
    "organization": "Canadian Space Agency",
    "url": "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/",
    "source_type": "educational_reference",
}

def save_json(filename, description, data):
    document = {
        "dataset": filename.replace(".json", ""),
        "description": description,
        "source": SOURCE,
        "records": data,
    }

    path = OUTPUT / filename
    path.write_text(
        json.dumps(document, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Created: {path}")


# 1. Crop reference
crops = [
    {
        "crop": "Soybean",
        "nutrients": [
            "protein", "carbohydrates", "fats", "calcium",
            "magnesium", "iron", "folate"
        ],
        "growth_days": {"min": 45, "max": 65},
        "processing_before_consumption": "Boil in shell",
        "source_page": 2,
    },
    {
        "crop": "Lettuce (Green Leaf)",
        "nutrients": ["vitamin K", "vitamin A", "vitamin C"],
        "growth_days": {"min": 21, "max": 28},
        "processing_before_consumption": "None",
        "source_page": 2,
    },
    {
        "crop": "Carrot",
        "nutrients": [
            "vitamin A", "vitamin K", "potassium",
            "carbohydrates", "fibre"
        ],
        "growth_days": {"min": 70, "max": 80},
        "processing_before_consumption": "None",
        "source_page": 2,
    },
    {
        "crop": "Sweet potato",
        "nutrients": [
            "vitamin A", "vitamin C", "carbohydrates",
            "vitamin B6", "thiamin", "riboflavin",
            "potassium", "magnesium", "fibre"
        ],
        "growth_days": {"min": 90, "max": 170},
        "processing_before_consumption": "Boil or cook",
        "source_page": 2,
    },
    {
        "crop": "Chickpea",
        "nutrients": [
            "protein", "carbohydrates", "fats", "magnesium",
            "manganese", "iron", "folate", "fibre"
        ],
        "growth_stages": [
            {
                "stage": "immature_shell_beans",
                "growth_days": 80,
                "consumption": "Eat fresh",
            },
            {
                "stage": "dried_beans",
                "growth_days": 100,
                "consumption": "Cook before consumption",
            },
        ],
        "processing_before_consumption": (
            "Eat fresh at 80 days, or cook at or after 100 days"
        ),
        "source_page": 2,
    },
    {
        "crop": "Tomato",
        "nutrients": [
            "carbohydrates", "vitamin A", "vitamin C",
            "vitamin K", "fibre"
        ],
        "growth_days": {"min": 50, "max": 90},
        "processing_before_consumption": "None",
        "source_page": 2,
    },
    {
        "crop": "Wheat",
        "nutrients": [
            "carbohydrates", "protein", "iron", "magnesium",
            "phosphorus", "B vitamins", "folate", "zinc",
            "manganese", "selenium"
        ],
        "growth_days": {"min": 213, "max": 244},
        "approximate_duration": "7–8 months",
        "processing_before_consumption": "Grind into flour",
        "source_page": 2,
    },
    {
        "crop": "Dill",
        "nutrients": ["vitamin A", "vitamin C", "manganese", "fibre"],
        "growth_days": {"min": 90, "max": 90},
        "processing_before_consumption": "None",
        "source_page": 2,
    },
    {
        "crop": "Basil",
        "nutrients": ["vitamin K", "vitamin A"],
        "growth_days": {"min": 75, "max": 75},
        "processing_before_consumption": "None",
        "source_page": 2,
    },
]

save_json(
    "crop_reference.json",
    "Potential space crops, reported nutrients, growth durations and "
    "processing requirements.",
    crops,
)


# 2. Crop selection criteria
criteria = [
    {"criterion": "pollination_ability",
     "description": "Ability of the crop to pollinate.",
     "source_page": 2},
    {"criterion": "edible_biomass",
     "description": "Amount or proportion of the plant that is edible.",
     "source_page": 2},
    {"criterion": "nutritional_value",
     "description": "Nutritional contribution of the crop.",
     "source_page": 2},
    {"criterion": "ease_of_growth",
     "description": "How easily the crop can be grown.",
     "source_page": 2},
    {"criterion": "plant_size",
     "description": "Physical size of the crop.",
     "source_page": 2},
    {"criterion": "crew_preferences",
     "description": "Crew likes and dislikes, including flavour, texture "
                    "and appearance.",
     "source_page": 2},
    {"criterion": "environmental_requirements",
     "description": "Light, nutrients, temperature, water, humidity "
                    "and air requirements.",
     "source_page": 2},
    {"criterion": "time_to_harvest",
     "description": "Time required before the crop can be harvested.",
     "source_page": 2},
]

save_json(
    "crop_selection_criteria.json",
    "Factors to consider when selecting crops for space missions.",
    criteria,
)


# 3. ISS plant growth systems
iss_systems = [
    {
        "system": "Veggie",
        "location": "International Space Station",
        "purpose": "Study plant growth and function in weightlessness.",
        "method": "Seeds are germinated and grown using plant pillows.",
        "plant_pillows": {
            "prepared_on_earth": True,
            "contents": ["clay", "fertilizer", "seeds"],
            "preparation": "Precise amounts of clay, fertilizer and seeds.",
        },
        "research_goals": [
            "Understand plant growth in weightlessness",
            "Study changes in nutritional value",
            "Investigate psychological benefits for crew",
        ],
        "source_page": 3,
    },
    {
        "system": "Advanced Plant Habitat (APH)",
        "location": "International Space Station",
        "purpose": "Grow and study a variety of plants in a controlled "
                   "growth chamber.",
        "environmental_controls": [
            "temperature",
            "oxygen",
            "carbon dioxide",
        ],
        "lighting": {
            "technology": "LED",
            "colours": ["white", "red", "blue", "green"],
            "purpose": "Tailor lighting to the needs of different plants.",
        },
        "adjustable_settings": True,
        "source_page": 3,
    },
    {
        "system": "Future space plant systems",
        "purpose": "Potentially support crew through fresh food, oxygen "
                   "and recycled water.",
        "potential_benefits": [
            "fresh food",
            "oxygen supply",
            "water recycling",
        ],
        "source_page": 3,
    },
]

save_json(
    "iss_plant_growth_systems.json",
    "Plant cultivation systems and research on the International "
    "Space Station.",
    iss_systems,
)


# 4. Lunar agriculture challenges
challenges = [
    {
        "challenge": "water",
        "problem": "Liquid water is not easily available on the Moon.",
        "context": "Water is accessible near the lunar poles, but "
                   "additional water may need to be provided.",
        "possible_solution": [
            "Provide additional water",
            "Develop water supply and management systems",
        ],
        "source_page": 3,
    },
    {
        "challenge": "light",
        "problem": "Lunar daylight cycles differ significantly from Earth.",
        "context": "At the equator, one Moon-day is 28 Earth-days, "
                   "with approximately 14 Earth-days of light and "
                   "14 Earth-days of darkness. The South Pole has "
                   "almost constant sunlight.",
        "possible_solution": [
            "Use artificial lighting systems as needed",
        ],
        "source_page": 3,
    },
    {
        "challenge": "radiation",
        "problem": "The Moon lacks a magnetic field and is exposed "
                   "to space radiation.",
        "possible_solution": [
            "Grow plants in enclosed areas",
            "Shield plants from harmful radiation",
        ],
        "source_page": 3,
    },
    {
        "challenge": "atmosphere",
        "problem": "The Moon does not have an atmosphere.",
        "possible_solution": [
            "Provide atmospheric gases required for plant growth",
        ],
        "source_page": 3,
    },
    {
        "challenge": "temperature",
        "problem": "Extreme temperature variations create challenges "
                   "for plant cultivation.",
        "reported_context": {
            "location": "Lunar equator",
            "day_temperature_c": 120,
            "night_temperature_c": 130,
            "verification_status": "Source value requires verification; "
                                   "sign convention may be missing.",
        },
        "possible_solution": [
            "Use temperature regulation systems",
        ],
        "source_page": 3,
    },
    {
        "challenge": "soil",
        "problem": "Lunar regolith lacks the necessary nutrients for "
                   "plant growth and has a fine-dust texture.",
        "possible_solution": [
            "Use hydroponic systems",
            "Use aeroponic systems",
            "Grow plants in controlled environments such as greenhouses",
        ],
        "source_page": 3,
    },
]

save_json(
    "lunar_agriculture_challenges.json",
    "Environmental challenges and potential solutions for growing "
    "food on the Moon.",
    challenges,
)

print("\nAll four CSA reference files generated successfully.")
