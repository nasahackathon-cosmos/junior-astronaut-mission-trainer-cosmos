import csv
import hashlib
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OSDR = ROOT / "data" / "raw" / "osdr"
REPORT_DIR = ROOT / "docs" / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

EXPECTED = {
    "OSD-654/LSDS-66_microCT_uCT_TRANSFORMED.csv": (25, 10),
    "OSD-684/GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv": (22771, 13),
    "OSD-684/GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv": (22771, 78),
    "OSD-684/GLDS-615_rna_seq_SampleTable_GLbulkRNAseq.csv": (12, 2),
    "OSD-684/GLDS-615_rna_seq_contrasts_GLbulkRNAseq.csv": (2, 13),
}

ARCHIVES = [
    "OSD-654/OSD-654_metadata_OSD-654-ISA.zip",
    "OSD-684/OSD-684_metadata_OSD-684-ISA.zip",
]

results = []
errors = []


def record(message):
    print(message)
    results.append(message)


def validate_csv(relative_path, expected_rows, expected_columns):
    path = OSDR / relative_path
    record(f"\nFILE: {relative_path}")

    if not path.is_file():
        errors.append(f"Missing file: {relative_path}")
        record("  FAIL: file missing")
        return

    digest = hashlib.sha256(path.read_bytes()).hexdigest()

    try:
        with path.open("r", newline="", encoding="utf-8-sig") as handle:
            reader = csv.reader(handle)
            header = next(reader, None)

            if header is None:
                raise ValueError("CSV is empty")

            row_count = 0
            malformed_rows = 0
            empty_cells = 0
            first_column_values = []
            numeric_cells = 0
            nonnumeric_numeric_cells = 0

            for row in reader:
                row_count += 1

                if len(row) != len(header):
                    malformed_rows += 1

                empty_cells += sum(1 for value in row if not value.strip())

                if row and row[0].strip():
                    first_column_values.append(row[0].strip())

                # Numeric validation for measurement/expression columns.
                if "Normalized_Counts" in path.name:
                    values = row[1:]
                elif "TRANSFORMED" in path.name:
                    values = row[1:]
                else:
                    values = []

                for value in values:
                    if not value.strip():
                        continue
                    try:
                        float(value)
                        numeric_cells += 1
                    except ValueError:
                        nonnumeric_numeric_cells += 1

        duplicate_ids = len(first_column_values) - len(set(first_column_values))

        record(f"  Rows: {row_count} (expected {expected_rows})")
        record(f"  Columns: {len(header)} (expected {expected_columns})")
        record(f"  Empty cells: {empty_cells}")
        record(f"  Malformed row lengths: {malformed_rows}")
        record(f"  Duplicate first-column IDs: {duplicate_ids}")
        record(f"  SHA-256: {digest}")

        if numeric_cells or nonnumeric_numeric_cells:
            record(
                f"  Numeric cells checked: {numeric_cells}; "
                f"non-numeric: {nonnumeric_numeric_cells}"
            )

        if row_count != expected_rows or len(header) != expected_columns:
            errors.append(f"Unexpected shape: {relative_path}")

        if malformed_rows:
            errors.append(f"Malformed rows: {relative_path}")

        if duplicate_ids:
            record("  NOTE: repeated first-column identifiers need interpretation")

        if nonnumeric_numeric_cells:
            errors.append(f"Unexpected non-numeric measurement values: {relative_path}")

        if "SampleTable" in path.name:
            with path.open("r", newline="", encoding="utf-8-sig") as handle:
                sample_rows = list(csv.DictReader(handle))
            conditions = {}
            for row in sample_rows:
                condition = row.get("condition", "").strip()
                conditions[condition] = conditions.get(condition, 0) + 1
            record(f"  Condition groups: {conditions}")

        record("  PASS: readable CSV")

    except Exception as exc:
        errors.append(f"Could not validate {relative_path}: {exc}")
        record(f"  FAIL: {exc}")


record("NASA OSDR DATA VALIDATION")
record("==========================")

for relative_path, shape in EXPECTED.items():
    validate_csv(relative_path, *shape)

for relative_path in ARCHIVES:
    path = OSDR / relative_path
    record(f"\nARCHIVE: {relative_path}")

    if not path.is_file():
        errors.append(f"Missing archive: {relative_path}")
        record("  FAIL: archive missing")
        continue

    try:
        with zipfile.ZipFile(path) as archive:
            bad_member = archive.testzip()
            members = archive.namelist()

        if bad_member:
            errors.append(f"Corrupt ZIP member in {relative_path}: {bad_member}")
            record(f"  FAIL: corrupt member {bad_member}")
        else:
            record(f"  Members: {len(members)}")
            for member in members:
                record(f"    - {member}")
            record("  PASS: ZIP integrity")

    except Exception as exc:
        errors.append(f"Invalid ZIP {relative_path}: {exc}")
        record(f"  FAIL: {exc}")

record("\nVALIDATION SUMMARY")
record("==================")

if errors:
    record(f"FAILURES: {len(errors)}")
    for error in errors:
        record(f"  - {error}")
else:
    record("All structural and archive checks passed.")

report_path = REPORT_DIR / "osdr_validation.txt"
report_path.write_text("\n".join(results) + "\n", encoding="utf-8")
record(f"\nReport saved to: {report_path.relative_to(ROOT)}")

sys.exit(1 if errors else 0)
