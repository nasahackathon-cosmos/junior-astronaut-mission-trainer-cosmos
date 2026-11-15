"""Game-facing configuration and deterministic mission selection.

This module deliberately reuses the validated mission catalogue instead of
copying mission facts into the frontend.  Game economy numbers are mechanics,
not scientific observations, and are kept here as one small configuration.
"""

from __future__ import annotations

import json
import os
from typing import Any
from urllib.request import Request, urlopen

from .mission_data import get_mission_evidence, list_missions


GAME_CONFIG: dict[str, Any] = {
    "version": "1.0.0",
    "campaign_sequence": [f"M{day:03d}" for day in range(1, 31)],
    "environments": [
        {
            "id": "mars",
            "name": "Mars Mission",
            "tagline": "Read the terrain. Choose the safest route.",
            "accent": "rust",
            "region": "Jezero Crater, Mars",
            "intro": "Use the project's MOLA and TES terrain products when a mission is mapped to Jezero.",
        },
        {
            "id": "moon",
            "name": "Moon Mission",
            "tagline": "Learn from lunar-flyby and space-biology evidence.",
            "accent": "lunar",
            "region": "Lunar mission training zone",
            "intro": "Artemis I radiation records and lunar agriculture references are shown with their research boundaries.",
        },
    ],
    "starting_resources": {"oxygen": 78, "energy": 72, "equipment": 84, "food": 68, "water": 74, "coins": 120},
    "upgrades": [
        {"id": "oxygen", "name": "Oxygen reserve", "description": "Adds breathing reserve for oxygen-intensive activities.", "base_price": 70, "effect": {"oxygen_max": 12}},
        {"id": "energy", "name": "Power cell", "description": "Adds energy capacity for tools and habitat systems.", "base_price": 65, "effect": {"energy_max": 12}},
        {"id": "equipment", "name": "Field toolkit", "description": "Improves equipment readiness and discovery rewards.", "base_price": 80, "effect": {"equipment_max": 10}},
    ],
}


CAMPAIGN_SEQUENCE = tuple(f"M{day:03d}" for day in range(1, 31))


def _keywords(mission: dict[str, Any]) -> str:
    return " ".join(str(mission.get(field, "")) for field in ("title", "gameplay", "data_status")).lower()


def _objective(
    mission_id: str,
    suffix: str,
    description: str,
    interaction: str,
    target: str,
    action: str,
    activity: str,
    **extra: Any,
) -> dict[str, Any]:
    return {
        "id": f"{mission_id.lower()}-{suffix}",
        "description": description,
        "interaction": interaction,
        "target": target,
        "completion_action": action,
        "activity": activity,
        **extra,
    }


def _mission_objectives(mission_id: str, environment: str) -> list[dict[str, Any]]:
    """Return the authoritative, playable objective graph for one campaign day."""
    common_report = _objective(mission_id, "report", "Record the result in the mission log.", "record", "mission-log", "record_result", "report")
    definitions: dict[str, list[dict[str, Any]]] = {
        "M001": [_objective(mission_id, "inventory", "Inspect the spacecraft inventory console.", "inspect", "inventory-console", "inspect_inventory", "resources"), _objective(mission_id, "supplies", "Check food, water and oxygen supplies and identify shortages.", "resource", "supply-locker", "check_supplies", "resources"), _objective(mission_id, "weather", "Check the space-weather display and record the risk.", "observe", "weather-console", "check_space_weather", "observation"), common_report],
        "M002": [_objective(mission_id, "medium", "Prepare the growing medium.", "plant", "space-greenhouse", "prepare_medium", "plants"), _objective(mission_id, "seeds", "Plant the selected seeds.", "plant", "space-greenhouse", "plant_seeds", "plants"), _objective(mission_id, "water", "Add water and configure the plant light.", "plant", "space-greenhouse", "water_and_light", "plants"), _objective(mission_id, "growth", "Monitor growth and compare the results.", "observe", "space-greenhouse", "compare_growth", "plants"), common_report],
        "M003": [_objective(mission_id, "equipment", "Set up the eclipse observation equipment.", "inspect", "observation-deck", "use_observation_equipment", "observation"), _objective(mission_id, "alignment", "Observe the Sun, Earth and Moon alignment.", "observe", "observation-deck", "observe_alignment", "observation"), _objective(mission_id, "science", "Answer the eclipse science questions.", "quiz", "science-console", "answer_science_questions", "science"), common_report],
        "M004": [_objective(mission_id, "system", "Inspect the fuel system.", "inspect", "fuel-panel", "inspect_fuel_system", "repair"), _objective(mission_id, "connector", "Find the faulty connector.", "repair", "fuel-panel", "find_faulty_connector", "repair"), _objective(mission_id, "repair", "Use the diagnostic toolkit to repair the connector.", "repair", "fuel-panel", "repair_connector", "repair"), _objective(mission_id, "verify", "Verify the repaired fuel system.", "inspect", "fuel-panel", "verify_fuel_system", "repair"), common_report],
        "M005": [_objective(mission_id, "inspect", "Inspect the communication equipment.", "inspect", "comms-panel", "inspect_comms", "repair"), _objective(mission_id, "fault", "Identify the communication fault.", "repair", "comms-panel", "identify_comms_fault", "repair"), _objective(mission_id, "repair", "Repair the communication system.", "repair", "comms-panel", "repair_comms", "repair"), _objective(mission_id, "link", "Re-establish communication with Earth.", "transmit", "comms-panel", "restore_earth_link", "communication"), common_report],
        "M006": [_objective(mission_id, "warning", "Receive and inspect the asteroid warning.", "inspect", "flight-console", "receive_asteroid_warning", "hazard"), _objective(mission_id, "asteroid", "Inspect the approaching asteroid data.", "observe", "telescope", "inspect_asteroid", "hazard"), _objective(mission_id, "route", "Analyse the spacecraft route.", "choose", "flight-console", "analyse_route", "navigation"), _objective(mission_id, "correction", "Prepare a safe course correction.", "choose", "flight-console", "prepare_correction", "navigation"), common_report],
        "M007": [_objective(mission_id, "navigation", "Navigate the spacecraft through the encounter corridor.", "navigate", "flight-console", "navigate_encounter", "rover"), _objective(mission_id, "decision", "Make the route decision and avoid collision.", "choose", "flight-console", "avoid_collision", "navigation"), _objective(mission_id, "lives", "Complete the impact-drill safety check.", "inspect", "safety-console", "complete_impact_drill", "hazard"), common_report],
        "M008": [_objective(mission_id, "telescope", "Use the telescope to explore the sky.", "observe", "telescope", "use_telescope", "observation"), _objective(mission_id, "objects", "Explore and identify astronomical objects.", "observe", "telescope", "identify_objects", "observation"), _objective(mission_id, "record", "Record the discoveries and answer the questions.", "record", "science-console", "record_discoveries", "science"), common_report],
        "M009": [_objective(mission_id, "fuel", "Check fuel, oxygen and power before landing.", "resource", "flight-console", "check_landing_resources", "resources"), _objective(mission_id, "ship", "Inspect the spacecraft landing systems.", "inspect", "flight-console", "inspect_landing_systems", "landing"), _objective(mission_id, "decision", "Make the emergency landing decision.", "choose", "flight-console", "choose_landing_plan", "landing"), common_report],
        "M010": [_objective(mission_id, "area", "Explore and inspect the landing area.", "navigate", "landing-site", "inspect_landing_area", "exploration"), _objective(mission_id, "damage", "Inspect spacecraft damage.", "inspect", "spacecraft", "inspect_landing_damage", "inspection"), _objective(mission_id, "health", "Perform the astronaut health check.", "inspect", "medical-station", "perform_health_check", "health"), common_report],
        "M011": [_objective(mission_id, "systems", "Repair the damaged electrical systems.", "repair", "power-station", "repair_power_system", "repair"), _objective(mission_id, "panels", "Interact with the solar panels.", "interact", "solar-panels", "deploy_solar_panels", "power"), _objective(mission_id, "placement", "Choose a safe panel placement.", "choose", "solar-panels", "choose_panel_placement", "power"), _objective(mission_id, "power", "Restore base electricity.", "inspect", "power-station", "verify_power", "power"), common_report],
        "M012": [_objective(mission_id, "materials", "Collect construction materials.", "pickup", "construction-yard", "collect_materials", "construction"), _objective(mission_id, "shelter", "Build the planetary shelter.", "interact", "construction-yard", "build_shelter", "construction"), _objective(mission_id, "priorities", "Prioritise greenhouse, oxygen, radiation protection and power.", "choose", "base-console", "prioritise_base_systems", "construction"), common_report],
        "M013": [_objective(mission_id, "plant", "Plant vegetables in the greenhouse.", "plant", "greenhouse", "plant_vegetables", "plants"), _objective(mission_id, "maintain", "Water and maintain the plants.", "plant", "greenhouse", "maintain_vegetables", "plants"), _objective(mission_id, "monitor", "Monitor growth and record observations.", "observe", "greenhouse", "monitor_vegetables", "plants"), common_report],
        "M014": [_objective(mission_id, "rover", "Enter rover control.", "rover", "rover", "enter_rover", "rover"), _objective(mission_id, "drive", "Drive across the terrain and avoid obstacles.", "rover", "rover", "drive_to_crater", "rover"), _objective(mission_id, "crater", "Investigate the crater.", "observe", "crater", "investigate_crater", "science"), _objective(mission_id, "sample", "Collect a crater sample.", "collect", "crater", "collect_crater_sample", "samples"), common_report],
        "M015": [_objective(mission_id, "point", "Reach the planetary observation point.", "navigate", "observation-point", "reach_observation_point", "observation"), _objective(mission_id, "horizon", "Observe the sunrise or sunset horizon.", "observe", "observation-point", "observe_horizon", "observation"), _objective(mission_id, "photo", "Take a photograph and record the observation.", "photo", "observation-point", "photograph_horizon", "observation"), common_report],
        "M016": [_objective(mission_id, "biology", "Perform the biological experiment.", "experiment", "experiment-bench", "run_biology_experiment", "science"), _objective(mission_id, "technology", "Perform the technology experiment.", "experiment", "experiment-bench", "run_technology_experiment", "science"), _objective(mission_id, "compare", "Collect and compare the results.", "record", "science-console", "compare_experiment_results", "science"), common_report],
        "M017": [_objective(mission_id, "locations", "Visit different regolith locations.", "navigate", "sample-sites", "visit_sample_sites", "samples"), _objective(mission_id, "samples", "Collect and compare soil samples.", "collect", "sample-sites", "collect_regolith_samples", "samples"), _objective(mission_id, "bricks", "Make simulated construction bricks.", "experiment", "construction-bench", "make_regolith_bricks", "construction"), common_report],
        "M018": [_objective(mission_id, "health", "Perform the astronaut health check.", "inspect", "medical-station", "perform_fitness_check", "health"), _objective(mission_id, "exercise", "Complete the exercise mini-games.", "interact", "exercise-station", "complete_exercise", "health"), _objective(mission_id, "monitor", "Monitor and record astronaut health.", "record", "medical-station", "record_health", "health"), common_report],
        "M019": [_objective(mission_id, "gravity", "Measure and compare gravity.", "observe", "science-console", "measure_gravity", "environment"), _objective(mission_id, "atmosphere", "Measure atmosphere, weather and radiation.", "observe", "science-console", "measure_environment", "environment"), _objective(mission_id, "day", "Compare planetary day length.", "compare", "science-console", "compare_day_length", "environment"), common_report],
        "M020": [_objective(mission_id, "cake", "Prepare the dehydrated birthday cake.", "interact", "galley", "prepare_birthday_cake", "celebration"), _objective(mission_id, "celebration", "Organise the space birthday celebration.", "interact", "habitat", "organise_celebration", "celebration"), _objective(mission_id, "pico", "Share the birthday moment with PICO-7.", "dialogue", "pico7", "birthday_dialogue", "dialogue"), common_report],
        "M021": [_objective(mission_id, "telescope", "Use the telescope to explore candidate exoplanets.", "observe", "telescope", "explore_exoplanets", "science"), _objective(mission_id, "database", "Search the scientific database.", "inspect", "science-console", "search_exoplanet_database", "science"), _objective(mission_id, "research", "Complete the habitability research activity.", "record", "science-console", "record_exoplanet_research", "science"), common_report],
        "M022": [_objective(mission_id, "phenomenon", "Observe the aurora or airglow.", "observe", "observation-point", "observe_atmospheric_phenomenon", "observation"), _objective(mission_id, "camera", "Use the camera to document it.", "photo", "observation-point", "photograph_airglow", "observation"), _objective(mission_id, "record", "Record the atmospheric observation.", "record", "science-console", "record_airglow", "science"), common_report],
        "M023": [_objective(mission_id, "reserve", "Inspect reserve food and harvested crops.", "resource", "food-storage", "inspect_food_reserve", "resources"), _objective(mission_id, "calculate", "Calculate remaining supplies and make a ration decision.", "choose", "food-storage", "calculate_supplies", "resources"), _objective(mission_id, "request", "Use the one-time Earth supply request if needed.", "transmit", "comms-panel", "request_earth_supply", "resources"), common_report],
        "M025": [_objective(mission_id, "observe", "Observe the incoming resupply spacecraft.", "observe", "landing-site", "observe_resupply", "resupply"), _objective(mission_id, "receive", "Receive the food cargo.", "pickup", "cargo-bay", "receive_food", "resupply"), _objective(mission_id, "inventory", "Inspect cargo and update the inventory.", "resource", "cargo-bay", "update_resupply_inventory", "resupply"), common_report],
        "M026": [_objective(mission_id, "inspect", "Inspect the damaged greenhouse.", "inspect", "greenhouse", "inspect_greenhouse_damage", "repair"), _objective(mission_id, "repair", "Repair the greenhouse structure.", "repair", "greenhouse", "repair_greenhouse_structure", "repair"), _objective(mission_id, "systems", "Restore environmental systems and protect plants.", "repair", "greenhouse", "restore_greenhouse_systems", "repair"), common_report],
        "M027": [_objective(mission_id, "arrival", "Observe the arriving spacecraft.", "observe", "landing-site", "observe_arrival", "dialogue"), _objective(mission_id, "meet", "Meet the second astronaut.", "dialogue", "habitat", "meet_astronaut", "dialogue"), _objective(mission_id, "friendship", "Build friendship through conversation.", "dialogue", "habitat", "build_friendship", "dialogue"), common_report],
        "M028": [_objective(mission_id, "team", "Work with the second astronaut on the experiment.", "dialogue", "experiment-bench", "start_joint_experiment", "science"), _objective(mission_id, "experiment", "Perform the collaborative science experiment.", "experiment", "experiment-bench", "run_joint_experiment", "science"), _objective(mission_id, "results", "Exchange and compare results.", "record", "science-console", "exchange_results", "science"), common_report],
        "M029": [_objective(mission_id, "samples", "Pack the research samples.", "pickup", "cargo-bay", "pack_samples", "departure"), _objective(mission_id, "systems", "Check fuel, oxygen, power and life support.", "resource", "flight-console", "check_departure_resources", "departure"), _objective(mission_id, "goodbye", "Say goodbye to the new friend.", "dialogue", "habitat", "say_goodbye", "dialogue"), common_report],
        "M030": [_objective(mission_id, "checks", "Complete the final launch checks.", "inspect", "flight-console", "complete_final_checks", "return"), _objective(mission_id, "launch", "Launch from the planetary surface and travel to Earth.", "choose", "flight-console", "launch_return", "return"), _objective(mission_id, "report", "Present the research report and final discoveries.", "transmit", "mission-log", "present_final_report", "return"), _objective(mission_id, "farewell", "Share a meaningful farewell with PICO-7.", "dialogue", "pico7", "final_farewell", "dialogue")],
    }
    if mission_id == "M024":
        if environment == "mars":
            return [_objective(mission_id, "drone", "Deploy the Martian drone.", "interact", "drone-bay", "deploy_martian_drone", "rover"), _objective(mission_id, "locate", "Search for and locate the stopped rover.", "navigate", "rover-site", "locate_stopped_rover", "rover"), _objective(mission_id, "diagnose", "Diagnose and reactivate the rover.", "repair", "rover-site", "reactivate_rover", "rover"), _objective(mission_id, "recover", "Recover the rover and rock sample.", "collect", "rover-site", "recover_rover_sample", "samples"), common_report]
        return [_objective(mission_id, "explore", "Explore the lunar surface safely.", "navigate", "lunar-site", "explore_lunar_surface", "exploration"), _objective(mission_id, "locate", "Locate the human-made artifacts and equipment.", "observe", "lunar-site", "locate_lunar_artifacts", "science"), _objective(mission_id, "collect", "Collect the appropriate objects safely.", "collect", "lunar-site", "collect_lunar_artifacts", "samples"), _objective(mission_id, "transport", "Transport the objects safely to the spacecraft.", "pickup", "cargo-bay", "transport_lunar_artifacts", "samples"), common_report]
    return definitions[mission_id]


def select_mission(environment: str, day: int, player_seed: str, history: list[str] | None = None) -> dict[str, Any]:
    """Select the next mission in the authoritative 30-day campaign."""
    if environment not in {"mars", "moon"}:
        raise ValueError("environment must be mars or moon")
    if not 1 <= day <= 30:
        raise ValueError("day must be between 1 and 30")
    completed = list(history or [])
    expected_history = list(CAMPAIGN_SEQUENCE[: day - 1])
    if completed != expected_history:
        raise ValueError("the requested day is locked until the previous campaign missions are completed in order")
    if not player_seed:
        raise ValueError("player_seed is required")
    mission_id = CAMPAIGN_SEQUENCE[day - 1]
    mission = dict(next(item for item in list_missions() if item["mission_id"] == mission_id))
    evidence = get_mission_evidence(mission["mission_id"])
    branch = None
    if mission_id == "M024":
        branch = "rover-recovery" if environment == "mars" else "lunar-artifact-investigation"
    mission["game_context"] = {
        "day": day,
        "environment": environment,
        "category": "Mission preparation" if day == 1 else _category(mission),
        "difficulty": "Easy" if day < 8 else "Medium" if day < 21 else "Hard",
        "data_status": mission.get("data_status", "Not specified in catalogue"),
        "evidence_available": evidence.get("overall_evidence_status") == "mapped" if evidence else False,
        "evidence_sources": evidence.get("available_evidence_sources", []) if evidence else [],
        "is_new_for_player": True,
        "branch": branch,
        "objectives": _mission_objectives(mission_id, environment),
        "world": "spacecraft" if day <= 9 else "surface" if day <= 29 else "return",
        "activity": _mission_objectives(mission_id, environment)[0].get("activity", "mission"),
    }
    return mission


def validate_mission_completion(
    environment: str,
    day: int,
    mission_id: str,
    player_seed: str,
    history: list[str] | None,
    completed_objectives: list[str] | None,
    objective_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Validate a completed mission without storing server-side player state."""
    mission = select_mission(environment, day, player_seed, history)
    if mission["mission_id"] != mission_id:
        raise ValueError("mission does not match the requested campaign day")
    expected = {item["id"] for item in mission["game_context"]["objectives"]}
    actual = list(completed_objectives or [])
    if len(actual) != len(set(actual)):
        raise ValueError("completed objectives must be unique")
    if set(actual) != expected:
        raise ValueError("all required mission objectives must be completed")
    evidence = objective_evidence or {}
    for objective in mission["game_context"]["objectives"]:
        if evidence and evidence.get(objective["id"]) != objective["completion_action"]:
            raise ValueError(f"objective evidence is invalid for {objective['id']}")
    return {
        "mission_id": mission_id,
        "environment": environment,
        "day": day,
        "completed": True,
        "next_day": min(30, day + 1),
        "next_mission_id": CAMPAIGN_SEQUENCE[day] if day < 30 else None,
    }


def _category(mission: dict[str, Any]) -> str:
    text = _keywords(mission)
    for label, words in (("Terrain", ("terrain", "rover", "slope", "crater")), ("Space weather", ("radiation", "solar", "weather")), ("Life systems", ("food", "water", "plant", "muscle", "bone")), ("Systems", ("equipment", "communication", "fuel", "system"))):
        if any(word in text for word in words):
            return label
    return "Mission science"


def get_game_config() -> dict[str, Any]:
    return GAME_CONFIG


def _fallback_mission_package(mission: dict[str, Any], environment: str, day: int) -> dict[str, Any]:
    objective = mission.get("game_context", {}).get("objectives", [{}])[0]
    return {
        "source": "catalogue_fallback",
        "ai_generated": False,
        "provider": None,
        "model": None,
        "mission_id": mission["mission_id"],
        "day": day,
        "environment": environment,
        "title": mission.get("title", mission["mission_id"]),
        "scenario": mission.get("gameplay", "Complete a short, clearly labelled educational mission simulation."),
        "why": "This short activity helps the astronaut practise the mission concept.",
        "objective": objective.get("description", "Complete the marked mission activity."),
        "actions": [
            {"label": "Inspect the marked station", "success": True, "feedback": "Good observation. You found the relevant mission station."},
            {"label": "Record the simulated result", "success": True, "feedback": "Mission log updated. This is a game simulation, not live telemetry."},
        ],
        "science": mission.get("scientific_correction", "Scientific evidence remains separate from simulated game state."),
        "completion": "Mission complete. Your expedition log has been updated.",
        "reward": 25,
    }


def _validate_mission_package(package: Any, mission_id: str, environment: str, day: int) -> dict[str, Any]:
    if not isinstance(package, dict):
        raise ValueError("AI mission package must be an object")
    required = ("title", "scenario", "why", "objective", "actions", "science", "completion", "reward")
    if any(not package.get(key) for key in required):
        raise ValueError("AI mission package is missing required fields")
    actions = package["actions"]
    if not isinstance(actions, list) or not 2 <= len(actions) <= 3:
        raise ValueError("AI mission package must contain two or three actions")
    for action in actions:
        if not isinstance(action, dict) or not action.get("label") or not action.get("feedback") or not isinstance(action.get("success"), bool):
            raise ValueError("AI mission actions have an invalid structure")
    try:
        reward = max(0, min(100, int(package["reward"])))
    except (TypeError, ValueError) as exc:
        raise ValueError("AI mission reward must be an integer") from exc
    return {
        "source": "ai",
        "ai_generated": True,
        "provider": package.get("provider"),
        "model": package.get("model"),
        "mission_id": mission_id,
        "day": day,
        "environment": environment,
        "title": str(package["title"])[:120],
        "scenario": str(package["scenario"])[:500],
        "why": str(package["why"])[:350],
        "objective": str(package["objective"])[:350],
        "actions": [{"label": str(a["label"])[:160], "success": a["success"], "feedback": str(a["feedback"])[:300]} for a in actions],
        "science": str(package["science"])[:500],
        "completion": str(package["completion"])[:250],
        "reward": reward,
    }


def generate_mission_package(environment: str, day: int, player_seed: str, history: list[str] | None = None) -> dict[str, Any]:
    """Generate one cached-at-client mission package when a provider is configured.

    The catalogue remains authoritative for identity, order and scientific boundaries.
    Without an explicitly configured provider/key, the response is an honest playable
    catalogue fallback and is labelled as such.
    """
    mission = select_mission(environment, day, player_seed, history)
    fallback = _fallback_mission_package(mission, environment, day)
    provider = os.getenv("COSMOS_AI_PROVIDER", "").strip().lower()
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if provider not in {"openai", "openai-compatible"} or not api_key:
        return fallback
    model = os.getenv("COSMOS_AI_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    prompt = {
        "mission_id": mission["mission_id"], "day": day, "environment": environment,
        "catalogue_title": mission.get("title"), "catalogue_gameplay": mission.get("gameplay"),
        "scientific_correction": mission.get("scientific_correction"),
        "objective_blueprint": mission.get("game_context", {}).get("objectives", []),
    }
    body = {"model": model, "temperature": 0.2, "response_format": {"type": "json_object"}, "messages": [
        {"role": "system", "content": "Create a short educational astronaut mission for children aged 7-12. Return only JSON with title, scenario, why, objective, actions (2-3 objects with label, success boolean, feedback), science, completion, reward. Never invent NASA measurements. Label simulations as simulated. Preserve the supplied mission concept."},
        {"role": "user", "content": json.dumps(prompt)},
    ]}
    try:
        request = Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(), headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode())
        content = payload["choices"][0]["message"]["content"]
        generated = json.loads(content)
        generated["provider"] = provider
        generated["model"] = model
        return _validate_mission_package(generated, mission["mission_id"], environment, day)
    except Exception:
        return {**fallback, "generation_error": "Configured AI generation failed; using the labelled catalogue fallback."}
