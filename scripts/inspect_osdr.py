import csv
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/raw/osdr"

def read_csv(path):
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        return list(csv.reader(f))

def show_csv_schema(relative_path):
    path = BASE / relative_path
    rows = read_csv(path)
    header = rows[0]
    data = rows[1:]

    print(f"\n{'=' * 75}")
    print(relative_path)
    print(f"{'=' * 75}")

    print("\nCOLUMN HEADERS:")
    for i, name in enumerate(header):
        print(f"{i:02d}: {name!r}")

    print("\nMISSING VALUES BY COLUMN:")
    for i, name in enumerate(header):
        missing = sum(
            1 for row in data
            if i >= len(row) or not row[i].strip()
        )
        if missing:
            print(f"{name!r}: {missing} missing")

    if "TRANSFORMED" in path.name:
        print("\nALL BONE MEASUREMENT ROWS:")
        for row in data:
            print(row)

    if "SampleTable" in path.name or "contrasts" in path.name:
        print("\nALL ROWS:")
        for row in rows:
            print(row)

    if "differential_expression" in path.name:
        print("\nFIRST 3 DATA ROWS:")
        for row in data[:3]:
            for i, value in enumerate(row):
                print(f"  {header[i]}: {value}")
            print("---")

    if "Normalized_Counts" in path.name:
        print("\nSAMPLE COLUMN HEADERS:")
        print(header[1:])

        print("\nFIRST 3 GENE ROWS:")
        for row in data[:3]:
            print(row[:5], "...")

def inspect_archives():
    keywords = (
        "organism", "species", "strain", "sex", "age",
        "flight", "ground", "control", "sample", "tissue",
        "muscle", "bone", "tibia", "unit", "instrument",
        "treatment", "protocol", "description", "factor",
        "microgravity", "duration"
    )

    for archive_name in (
        "OSD-654/OSD-654_metadata_OSD-654-ISA.zip",
        "OSD-684/OSD-684_metadata_OSD-684-ISA.zip",
    ):
        path = BASE / archive_name
        print(f"\n{'=' * 75}")
        print(f"METADATA: {archive_name}")
        print(f"{'=' * 75}")

        with zipfile.ZipFile(path) as archive:
            for member in archive.namelist():
                print(f"\n--- {member} ---")
                text = archive.read(member).decode("utf-8", errors="replace")
                lines = text.splitlines()

                matches = [
                    (i, line) for i, line in enumerate(lines)
                    if any(word in line.lower() for word in keywords)
                ]

                if not matches:
                    print("(No matching metadata terms found)")
                    continue

                shown = set()
                for index, line in matches:
                    for j in range(max(0, index - 1), min(len(lines), index + 2)):
                        if j not in shown:
                            print(f"{j + 1}: {lines[j]}")
                            shown.add(j)

show_csv_schema(
    "OSD-654/LSDS-66_microCT_uCT_TRANSFORMED.csv"
)
show_csv_schema(
    "OSD-684/GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv"
)
show_csv_schema(
    "OSD-684/GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv"
)
show_csv_schema(
    "OSD-684/GLDS-615_rna_seq_SampleTable_GLbulkRNAseq.csv"
)
show_csv_schema(
    "OSD-684/GLDS-615_rna_seq_contrasts_GLbulkRNAseq.csv"
)
inspect_archives()
