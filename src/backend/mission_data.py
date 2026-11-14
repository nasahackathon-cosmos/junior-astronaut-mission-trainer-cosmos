"""Read-only access to the Junior Astronaut mission catalogue and OSDR evidence."""

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "processed" / "missions"

CATALOGUE_FILE = DATA_DIR / "mission_catalog.json"
CROSSWALK_FILE = DATA_DIR / "osdr_mission_crosswalk.json"


class MissionDataError(Exception):
    """Raised when mission data is missing or inconsistent."""


def _load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise MissionDataError(f"Required data file not found: {path}")

    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError) as exc:
        raise MissionDataError(f"Could not read {path}: {exc}") from exc


def load_mission_data() -> dict[str, Any]:
    """Load and validate both data files without modifying them."""
    catalogue = _load_json(CATALOGUE_FILE)
    crosswalk = _load_json(CROSSWALK_FILE)

    missions = catalogue.get("missions")
    sources = crosswalk.get("sources")
    mappings = crosswalk.get("mappings")

    if not isinstance(missions, list):
        raise MissionDataError("Catalogue missions must be a list.")
    if not isinstance(sources, list) or not isinstance(mappings, list):
        raise MissionDataError("Crosswalk sources and mappings must be lists.")

    mission_ids = [m.get("mission_id") for m in missions]
    source_ids = [s.get("source_id") for s in sources]

    if len(mission_ids) != len(set(mission_ids)):
        raise MissionDataError("Duplicate mission IDs in catalogue.")
    if len(source_ids) != len(set(source_ids)):
        raise MissionDataError("Duplicate source IDs in crosswalk.")

    known_missions = set(mission_ids)
    known_sources = set(source_ids)

    for mapping in mappings:
        if mapping.get("mission_id") not in known_missions:
            raise MissionDataError(
                f"Crosswalk references unknown mission: {mapping.get('mission_id')}"
            )
        for source_id in mapping.get("source_ids", []):
            if source_id not in known_sources:
                raise MissionDataError(
                    f"Crosswalk references unknown source: {source_id}"
                )

    return {"catalogue": catalogue, "crosswalk": crosswalk}


def list_missions() -> list[dict[str, Any]]:
    """Return all mission records in catalogue order."""
    data = load_mission_data()
    return data["catalogue"]["missions"]


def get_mission(mission_id: str) -> dict[str, Any] | None:
    """Return one mission record, or None if the ID does not exist."""
    for mission in list_missions():
        if mission["mission_id"] == mission_id:
            return mission
    return None


def get_mission_evidence(mission_id: str) -> dict[str, Any] | None:
    """
    Return a mission's evidence mappings and source metadata.

    Missions without an OSDR mapping are explicitly marked as not_mapped.
    This does not imply that no other NASA/CSA resource exists.
    """
    data = load_mission_data()
    mission = next(
        (
            item
            for item in data["catalogue"]["missions"]
            if item["mission_id"] == mission_id
        ),
        None,
    )

    if mission is None:
        return None

    source_index = {
        source["source_id"]: source
        for source in data["crosswalk"]["sources"]
    }

    mappings = [
        mapping
        for mapping in data["crosswalk"]["mappings"]
        if mapping["mission_id"] == mission_id
    ]

    evidence = []
    for mapping in mappings:
        for source_id in mapping.get("source_ids", []):
            evidence.append({
                "source_id": source_id,
                "evidence_role": mapping["evidence_role"],
                "rationale": mapping.get("rationale", ""),
                "mapping_limitations": mapping.get("limitations", ""),
                "source": source_index[source_id],
            })

    return {
        "mission_id": mission_id,
        "evidence_status": "mapped" if evidence else "not_mapped",
        "evidence": evidence,
        "simulation_boundary": data["crosswalk"].get(
            "simulation_boundary", {}
        ),
    }


def get_data_summary() -> dict[str, Any]:
    """Return counts and IDs for a quick project-level status check."""
    data = load_mission_data()
    catalogue = data["catalogue"]
    crosswalk = data["crosswalk"]

    return {
        "mission_count": len(catalogue["missions"]),
        "osdr_source_count": len(crosswalk["sources"]),
        "mapped_mission_count": len({
            item["mission_id"] for item in crosswalk["mappings"]
        }),
        "mapped_mission_ids": sorted({
            item["mission_id"] for item in crosswalk["mappings"]
        }),
    }
