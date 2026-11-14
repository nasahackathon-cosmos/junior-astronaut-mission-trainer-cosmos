import csv
import hashlib
import json
import re
from pathlib import Path

from docx import Document

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "Downloads/Junior_Astronaut_Mission_Trainer_100_Missions_Age_7-12_Revised.docx"
OUT = ROOT / "data/processed/missions"

MISSION_RE = re.compile(r"^(M\d{3})\s*[—–-]\s*(.+)$")

def fail(message):
    raise SystemExit(f"ERROR: {message}")

if not SOURCE.is_file():
    fail(f"Source DOCX not found: {SOURCE}")

OUT.mkdir(parents=True, exist_ok=True)

json_path = OUT / "mission_catalog.json"
csv_path = OUT / "mission_catalog.csv"

if json_path.exists() or csv_path.exists():
    fail("Catalogue output already exists. Nothing was overwritten.")

doc = Document(SOURCE)
missions = []
current = None

for paragraph in doc.paragraphs:
    text = paragraph.text.strip()
    if not text:
        continue

    match = MISSION_RE.match(text)

    if match:
        current = {
            "mission_id": match.group(1),
            "title": match.group(2).strip(),
            "gameplay": "",
            "scientific_correction": "",
            "data_resource_links": [],
            "data_status": "",
            "additional_details": [],
            "source_paragraphs": [],
        }
        missions.append(current)
        continue

    if paragraph.style.name.startswith("Heading"):
        current = None
        continue

    if current is None:
        continue

    current["source_paragraphs"].append(text)

    if text.startswith("Gameplay:"):
        current["gameplay"] = text.split(":", 1)[1].strip()

    elif text.startswith("Scientific correction / implementation:"):
        current["scientific_correction"] = text.split(":", 1)[1].strip()

    elif text.startswith("Data/resource links:"):
        links = text.split(":", 1)[1]
        current["data_resource_links"] = [
            item.strip() for item in links.split("|") if item.strip()
        ]

    elif text.startswith("Data status:"):
        current["data_status"] = text.split(":", 1)[1].strip()

    else:
        current["additional_details"].append(text)

expected = [f"M{i:03}" for i in range(1, 101)]
actual = [m["mission_id"] for m in missions]

if len(missions) != 100:
    fail(f"Expected 100 missions, found {len(missions)}")

if len(set(actual)) != len(actual):
    fail("Duplicate mission IDs found.")

if actual != expected:
    missing = sorted(set(expected) - set(actual))
    unexpected = sorted(set(actual) - set(expected))
    fail(f"Mission ID sequence mismatch. Missing={missing}; unexpected={unexpected}")

if any(not m["title"] for m in missions):
    fail("At least one mission has an empty title.")

# Extract the official resource catalogue and metadata recommendations.
official_resources = []
recommended_fields = []

for table in doc.tables:
    if not table.rows:
        continue

    headers = [cell.text.strip() for cell in table.rows[0].cells]

    if headers == ["Resource", "Official link", "How it supports the game"]:
        for row in table.rows[1:]:
            values = [cell.text.strip() for cell in row.cells]
            if len(values) == 3:
                official_resources.append({
                    "resource": values[0],
                    "official_link": values[1],
                    "purpose": values[2],
                })

    elif headers == ["Field", "Purpose"]:
        for row in table.rows[1:]:
            values = [cell.text.strip() for cell in row.cells]
            if len(values) == 2:
                recommended_fields.append({
                    "field": values[0],
                    "purpose": values[1],
                })

source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()

catalogue = {
    "catalogue_name": "Junior Astronaut Mission Trainer",
    "catalogue_version": "source-revised",
    "mission_count": len(missions),
    "provenance": {
        "source_file": SOURCE.name,
        "source_sha256": source_hash,
        "source_type": "DOCX supplied by project team",
    },
    "official_resources": official_resources,
    "recommended_engine_metadata_fields": recommended_fields,
    "missions": missions,
}

# Validate before writing.
if not official_resources:
    fail("Official resource table was not detected.")

if not recommended_fields:
    fail("Recommended metadata table was not detected.")

# Exclusive creation prevents accidental overwrites.
try:
    with json_path.open("x", encoding="utf-8") as f:
        json.dump(catalogue, f, indent=2, ensure_ascii=False)

    with csv_path.open("x", encoding="utf-8", newline="") as f:
        fields = [
            "mission_id", "title", "gameplay",
            "scientific_correction", "data_resource_links",
            "data_status", "additional_details", "source_paragraphs",
        ]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        for mission in missions:
            row = mission.copy()
            row["data_resource_links"] = " | ".join(
                row["data_resource_links"]
            )
            row["additional_details"] = " | ".join(
                row["additional_details"]
            )
            row["source_paragraphs"] = " | ".join(
                row["source_paragraphs"]
            )
            writer.writerow({key: row[key] for key in fields})

except FileExistsError:
    fail("An output file already exists. Check the output directory.")

print("MISSION CATALOGUE IMPORT SUCCESSFUL")
print("Missions:", len(missions))
print("Official resources:", len(official_resources))
print("Recommended metadata fields:", len(recommended_fields))
print("First:", missions[0]["mission_id"], missions[0]["title"])
print("Last:", missions[-1]["mission_id"], missions[-1]["title"])
print("JSON:", json_path.relative_to(ROOT))
print("CSV:", csv_path.relative_to(ROOT))
print("Source SHA-256:", source_hash)
