"""Read-only access to mission data and independent research/reference sources."""

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "processed" / "missions"

CATALOGUE_FILE = DATA_DIR / "mission_catalog.json"
CROSSWALK_FILE = DATA_DIR / "osdr_mission_crosswalk.json"
RADLAB_CROSSWALK_FILE = DATA_DIR / "radlab_mission_crosswalk_v1.json"
CSA_CROSSWALK_FILE = DATA_DIR / "csa_food_production_crosswalk.json"
MOLA_MAPPING_FILE = DATA_DIR / "mola_mission_mapping.json"
CSA_DATA_DIR = ROOT / "data" / "processed" / "food_production"
MARS_TREK_DATA_DIR = ROOT / "data" / "processed" / "mars_trek"


class MissionDataError(Exception):
    """Raised when mission data is missing or inconsistent."""

    def __init__(
        self,
        detail: str,
        *,
        public_detail: str | None = None,
    ) -> None:
        super().__init__(detail)
        self.public_detail = public_detail or detail


def _load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise MissionDataError(
            f"Required data file not found: {path}",
            public_detail="Required mission data is unavailable.",
        )

    try:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError) as exc:
        raise MissionDataError(
            f"Could not read {path}: {exc}",
            public_detail="Mission data could not be read.",
        ) from exc

    if not isinstance(data, dict):
        raise MissionDataError(
            f"Expected a JSON object in {path}",
            public_detail="Mission data has an invalid structure.",
        )

    return data


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate_crosswalk(
    crosswalk: dict[str, Any],
    label: str,
    known_missions: set[str],
) -> None:
    sources = crosswalk.get("sources")
    mappings = crosswalk.get("mappings")

    if not isinstance(sources, list) or not isinstance(mappings, list):
        raise MissionDataError(
            f"{label} crosswalk sources and mappings must be lists."
        )

    source_ids = []
    for source in sources:
        if not isinstance(source, dict) or not source.get("source_id"):
            raise MissionDataError(
                f"{label} crosswalk contains an invalid source record."
            )
        source_ids.append(source["source_id"])

    if len(source_ids) != len(set(source_ids)):
        raise MissionDataError(
            f"Duplicate source IDs in {label} crosswalk."
        )

    known_sources = set(source_ids)

    for mapping in mappings:
        if not isinstance(mapping, dict):
            raise MissionDataError(
                f"{label} crosswalk contains an invalid mapping."
            )

        mission_id = mapping.get("mission_id")
        if mission_id not in known_missions:
            raise MissionDataError(
                f"{label} crosswalk references unknown mission: "
                f"{mission_id}"
            )

        mapping_sources = mapping.get("source_ids", [])
        if not isinstance(mapping_sources, list):
            raise MissionDataError(
                f"{label} mapping source_ids must be a list."
            )

        for source_id in mapping_sources:
            if source_id not in known_sources:
                raise MissionDataError(
                    f"{label} crosswalk references unknown source: "
                    f"{source_id}"
                )


def _validate_mola_mapping(
    mapping: dict[str, Any],
    known_missions: set[str],
    data_root: Path,
) -> None:
    """Validate the standalone MOLA mission mapping and its datasets."""
    for field in ("module", "source", "region"):
        if not isinstance(mapping.get(field), str) or not mapping[field].strip():
            raise MissionDataError(
                f"MOLA mapping is missing a valid {field}."
            )

    if not isinstance(mapping.get("coverage"), dict):
        raise MissionDataError("MOLA mapping coverage must be an object.")
    if not isinstance(mapping.get("terrain_categories"), dict):
        raise MissionDataError(
            "MOLA mapping terrain_categories must be an object."
        )
    if not isinstance(mapping.get("limitations"), list):
        raise MissionDataError("MOLA mapping limitations must be a list.")

    missions = mapping.get("missions")
    if not isinstance(missions, list):
        raise MissionDataError("MOLA mapping missions must be a list.")
    if mapping.get("mission_count") != len(missions):
        raise MissionDataError(
            "MOLA mapping mission_count does not match missions list length."
        )

    mission_ids = []
    resolved_root = data_root.resolve()
    for item in missions:
        if not isinstance(item, dict):
            raise MissionDataError("MOLA mapping contains an invalid mission.")

        mission_id = item.get("mission_id")
        if mission_id not in known_missions:
            raise MissionDataError(
                f"MOLA mapping references unknown mission: {mission_id}"
            )
        mission_ids.append(mission_id)

        for field in ("title", "role", "usage", "limitation", "data_type"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise MissionDataError(
                    f"MOLA mission {mission_id} is missing a valid {field}."
                )

        datasets = item.get("datasets")
        if not isinstance(datasets, list) or not datasets or not all(
            isinstance(dataset, str) and dataset for dataset in datasets
        ):
            raise MissionDataError(
                f"MOLA mission {mission_id} must have dataset filenames."
            )

        for dataset in datasets:
            dataset_path = (resolved_root / dataset).resolve()
            if not dataset_path.is_relative_to(resolved_root):
                raise MissionDataError(
                    "MOLA dataset path is outside the Mars Trek directory: "
                    f"{dataset}",
                    public_detail="MOLA dataset configuration is invalid.",
                )
            if not dataset_path.is_file():
                raise MissionDataError(
                    f"MOLA dataset file not found: {dataset_path}",
                    public_detail="A configured MOLA dataset is unavailable.",
                )

    if len(mission_ids) != len(set(mission_ids)):
        raise MissionDataError("Duplicate mission IDs in MOLA mapping.")


def load_mission_data() -> dict[str, Any]:
    """Load and validate all mission metadata without modifying files."""
    catalogue = _load_json(CATALOGUE_FILE)
    osdr_crosswalk = _load_json(CROSSWALK_FILE)
    radlab_crosswalk = _load_json(RADLAB_CROSSWALK_FILE)
    csa_crosswalk = _load_json(CSA_CROSSWALK_FILE)
    mola_mapping = _load_json(MOLA_MAPPING_FILE)

    missions = catalogue.get("missions")
    if not isinstance(missions, list):
        raise MissionDataError("Catalogue missions must be a list.")

    mission_ids = []
    for mission in missions:
        if not isinstance(mission, dict) or not mission.get("mission_id"):
            raise MissionDataError("Catalogue contains an invalid mission.")
        mission_ids.append(mission["mission_id"])

    if len(mission_ids) != len(set(mission_ids)):
        raise MissionDataError("Duplicate mission IDs in catalogue.")

    known_missions = set(mission_ids)

    _validate_crosswalk(osdr_crosswalk, "OSDR", known_missions)
    _validate_crosswalk(radlab_crosswalk, "RadLab", known_missions)
    _validate_crosswalk(csa_crosswalk, "CSA", known_missions)
    _validate_mola_mapping(mola_mapping, known_missions, MARS_TREK_DATA_DIR)

    # CSA sources point to independent educational-reference datasets.
    # Resolve and validate each path before loading its records.
    csa_data_root = CSA_DATA_DIR.resolve()

    for source in csa_crosswalk["sources"]:
        filename = source.get("file")
        if not isinstance(filename, str) or not filename:
            raise MissionDataError(
                "CSA crosswalk source is missing a valid dataset filename."
            )

        dataset_path = (csa_data_root / filename).resolve()
        if dataset_path.parent != csa_data_root:
            raise MissionDataError(
                f"CSA dataset path is outside the food-production directory: "
                f"{filename}",
                public_detail="CSA dataset configuration is invalid.",
            )

        dataset = _load_json(dataset_path)
        records = dataset.get("records")
        if not isinstance(records, list):
            raise MissionDataError(
                f"CSA dataset must contain a records list: {dataset_path}"
            )

        # Preserve the original dataset metadata and record structure.
        source["dataset"] = dataset

    # The RadLab crosswalk records the exact catalogue version it was
    # generated against. Check that relationship when the hash is present.
    expected_catalogue_hash = radlab_crosswalk.get("catalogue_sha256")
    if expected_catalogue_hash:
        actual_catalogue_hash = _sha256(CATALOGUE_FILE)
        if actual_catalogue_hash != expected_catalogue_hash:
            raise MissionDataError(
                "RadLab crosswalk catalogue checksum does not match "
                "mission_catalog.json."
            )

    return {
        "catalogue": catalogue,
        "crosswalk": osdr_crosswalk,
        "radlab_crosswalk": radlab_crosswalk,
        "csa_crosswalk": csa_crosswalk,
        "mola_mapping": mola_mapping,
    }


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


def _get_evidence_for_source(
    mission_id: str,
    crosswalk: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build evidence records for one independent crosswalk."""
    source_index = {
        source["source_id"]: source
        for source in crosswalk["sources"]
    }

    evidence = []
    for mapping in crosswalk["mappings"]:
        if mapping["mission_id"] != mission_id:
            continue

        for source_id in mapping.get("source_ids", []):
            evidence.append({
                "source_id": source_id,
                "evidence_role": mapping["evidence_role"],
                "rationale": mapping.get("rationale", ""),
                "implementation_note": mapping.get(
                    "implementation_note", ""
                ),
                "mapping_limitations": mapping.get("limitations", []),
                "source": source_index[source_id],
            })

    return evidence


def get_mission_evidence(mission_id: str) -> dict[str, Any] | None:
    """
    Return independent OSDR, RadLab, CSA, and MOLA reference collections.

    The legacy `evidence` and `evidence_status` fields retain their original
    OSDR-only meaning for backward compatibility.
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

    osdr_evidence = _get_evidence_for_source(
        mission_id, data["crosswalk"]
    )
    radlab_evidence = _get_evidence_for_source(
        mission_id, data["radlab_crosswalk"]
    )
    csa_evidence = _get_evidence_for_source(
        mission_id, data["csa_crosswalk"]
    )
    mola = data["mola_mapping"]
    mola_context = {
        key: mola[key]
        for key in (
            "module", "source", "region", "coverage", "terrain_categories",
        )
    }
    mola_evidence = [
        {
            **mapping,
            **mola_context,
        }
        for mapping in mola["missions"]
        if mapping["mission_id"] == mission_id
    ]

    has_any_evidence = bool(
        osdr_evidence or radlab_evidence or csa_evidence or mola_evidence
    )

    return {
        "mission_id": mission_id,

        # Backward-compatible OSDR-only fields.
        "evidence_status": "mapped" if osdr_evidence else "not_mapped",
        "evidence": osdr_evidence,

        # Explicit independent evidence collections.
        "osdr_evidence": osdr_evidence,
        "radlab_evidence": radlab_evidence,
        "csa_evidence": csa_evidence,
        "mola_evidence": mola_evidence,
        "mola_context": mola_context,
        "evidence_by_source": {
            "osdr": osdr_evidence,
            "radlab": radlab_evidence,
            "csa": csa_evidence,
            "mola": mola_evidence,
        },

        # Combined availability is reported separately.
        "overall_evidence_status": (
            "mapped" if has_any_evidence else "not_mapped"
        ),
        "available_evidence_sources": [
            name
            for name, records in (
                ("osdr", osdr_evidence),
                ("radlab", radlab_evidence),
                ("csa", csa_evidence),
                ("mola", mola_evidence),
            )
            if records
        ],

        # Keep the scientific boundaries of each evidence collection
        # separate rather than combining unrelated policy statements.
        "simulation_boundary": data["crosswalk"].get(
            "simulation_boundary", {}
        ),
        "simulation_boundaries": {
            "osdr": data["crosswalk"].get("simulation_boundary", {}),
            "radlab": data["radlab_crosswalk"].get(
                "simulation_boundary", []
            ),
            "csa": data["csa_crosswalk"].get(
                "simulation_boundary", []
            ),
            "mola": mola["limitations"],
        },
    }


def get_mission_terrain_context(mission_id: str) -> dict[str, Any] | None:
    """Return the validated regional terrain association for one mission."""
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

    mola = data["mola_mapping"]
    mapping = next(
        (
            item
            for item in mola["missions"]
            if item["mission_id"] == mission_id
        ),
        None,
    )
    if mapping is None:
        return {
            "mission_id": mission_id,
            "terrain_status": "not_mapped",
            "association_type": None,
            "exact_coordinates": None,
        }

    base = {
        "mission_id": mission_id,
        "terrain_status": "mapped",
        "association_type": "regional_context",
        "exact_coordinates": None,
        "coordinate_note": (
            "This association identifies a Jezero regional terrain context; "
            "it does not provide an exact landing site, rover position, or "
            "NASA telemetry."
        ),
    }

    return {
        **base,
        "region": mola["region"],
        "coverage": mola["coverage"],
        "module": mola["module"],
        "source": mola["source"],
        "terrain_categories": mola["terrain_categories"],
        "limitations": mola["limitations"],
        "mission_context": mapping,
    }


def get_data_summary() -> dict[str, Any]:
    """Return catalogue and independent evidence-source counts."""
    data = load_mission_data()
    catalogue = data["catalogue"]
    osdr = data["crosswalk"]
    radlab = data["radlab_crosswalk"]
    csa = data["csa_crosswalk"]
    mola = data["mola_mapping"]

    osdr_mapped_ids = {
        item["mission_id"] for item in osdr["mappings"]
    }
    radlab_mapped_ids = {
        item["mission_id"] for item in radlab["mappings"]
    }
    csa_mapped_ids = {
        item["mission_id"] for item in csa["mappings"]
    }
    mola_mapped_ids = {
        item["mission_id"] for item in mola["missions"]
    }

    all_mapped_ids = (
        osdr_mapped_ids | radlab_mapped_ids | csa_mapped_ids | mola_mapped_ids
    )

    return {
        "mission_count": len(catalogue["missions"]),

        # Existing fields retained.
        "osdr_source_count": len(osdr["sources"]),
        "mapped_mission_count": len(osdr_mapped_ids),
        "mapped_mission_ids": sorted(osdr_mapped_ids),

        # New RadLab and combined fields.
        "radlab_source_count": len(radlab["sources"]),
        "radlab_mapped_mission_count": len(radlab_mapped_ids),
        "radlab_mapped_mission_ids": sorted(radlab_mapped_ids),

        # CSA educational-reference datasets.
        "csa_source_count": len(csa["sources"]),
        "csa_mapped_mission_count": len(csa_mapped_ids),
        "csa_mapped_mission_ids": sorted(csa_mapped_ids),

        # Standalone NASA MOLA / Jezero terrain references.
        "mola_source_count": 1,
        "mola_mapped_mission_count": len(mola_mapped_ids),
        "mola_mapped_mission_ids": sorted(mola_mapped_ids),

        # Combined unique mission coverage across all four sources.
        "overall_mapped_mission_count": len(all_mapped_ids),
        "overall_mapped_mission_ids": sorted(all_mapped_ids),
    }
