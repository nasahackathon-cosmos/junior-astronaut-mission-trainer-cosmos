import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/processed"

catalogue = json.loads(
    (BASE / "missions/mission_catalog.json").read_text(encoding="utf-8")
)
crosswalk = json.loads(
    (BASE / "missions/osdr_mission_crosswalk.json").read_text(encoding="utf-8")
)

mission_ids = {m["mission_id"] for m in catalogue["missions"]}
source_ids = {s["source_id"] for s in crosswalk["sources"]}
checks = {}

checks["100 catalogue missions"] = len(mission_ids) == 100
checks["Two OSDR source records"] = len(source_ids) == 2
checks["All mapping mission IDs exist"] = all(
    m["mission_id"] in mission_ids for m in crosswalk["mappings"]
)
checks["All mapping source IDs exist"] = all(
    sid in source_ids
    for m in crosswalk["mappings"]
    for sid in m["source_ids"] + m.get("optional_source_ids", [])
)
checks["No duplicate mission mappings"] = len({
    m["mission_id"] for m in crosswalk["mappings"]
}) == len(crosswalk["mappings"])

def inspect_csv(relative_path):
    path = ROOT / relative_path
    if not path.is_file():
        return set(), 0
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = set(reader.fieldnames or [])
        rows = sum(1 for _ in reader)
    return headers, rows

for source in crosswalk["sources"]:
    paths = source.get("files", [source.get("file")])
    paths = [p for p in paths if p]
    checks[f"{source['source_id']} all files exist"] = all(
        (ROOT / p).is_file() for p in paths
    )

# OSD-654: validate the actual microCT measurement file.
osd654 = next(s for s in crosswalk["sources"] if s["source_id"] == "OSD-654")
headers, rows = inspect_csv(osd654["file"])

required_654 = {
    "sample_id", "organism", "experimental_condition",
    "trabecular_separation_millimeter",
    "trabecular_number_1_per_millimeter",
    "cortical_thickness_millimeter", "measurement_complete"
}
checks["OSD-654 expected microCT columns"] = required_654.issubset(headers)
checks["OSD-654 has data rows"] = rows > 0

# OSD-684: sample metadata has its own dedicated file.
osd684 = next(s for s in crosswalk["sources"] if s["source_id"] == "OSD-684")
metadata_path = next(
    p for p in osd684["files"] if p.endswith("OSD-684_sample_metadata.csv")
)
headers, rows = inspect_csv(metadata_path)

required_684_metadata = {
    "sample_id", "organism", "sex", "tissue",
    "donor_age_group", "condition"
}
checks["OSD-684 sample metadata columns"] = required_684_metadata.issubset(headers)
checks["OSD-684 sample metadata has rows"] = rows > 0

# Confirm normalized counts and differential-expression files are readable.
for suffix in [
    "OSD-684_normalized_counts.csv",
    "OSD-684_differential_expression.csv",
    "OSD-684_contrasts.csv",
]:
    path = next(p for p in osd684["files"] if p.endswith(suffix))
    headers, rows = inspect_csv(path)
    checks[f"{suffix} readable with data"] = bool(headers) and rows > 0

for name, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}  {name}")

print("\nOverall:", "PASS" if all(checks.values()) else "FAIL")

if not all(checks.values()):
    raise SystemExit(1)
