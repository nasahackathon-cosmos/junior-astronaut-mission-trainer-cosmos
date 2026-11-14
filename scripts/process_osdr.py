import csv
import hashlib
import json
import math
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/osdr"
OUT = ROOT / "data/processed/osdr"
REPORT = ROOT / "docs/reports/osdr_processing_report.json"

OUT.mkdir(parents=True, exist_ok=True)


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = [h.strip() for h in reader.fieldnames]
        rows = []
        for row in reader:
            rows.append({(k.strip() if k else k): v for k, v in row.items()})
    return headers, rows


def read_metadata(zip_path, member):
    with zipfile.ZipFile(zip_path) as archive:
        with archive.open(member) as f:
            text = f.read().decode("utf-8-sig")
    lines = text.splitlines()
    reader = csv.DictReader(lines, delimiter="\t")
    return list(reader)


def write_csv(path, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def numeric_summary(headers, rows, skip=()):
    result = {}
    missing_tokens = {"", "NA", "N/A", "NULL", "NaN"}
    for header in headers:
        if header in skip:
            continue
        values = [r.get(header, "") for r in rows]
        missing = sum(v.strip() in missing_tokens for v in values)
        invalid = 0
        finite = 0
        for value in values:
            value = value.strip()
            if value in missing_tokens:
                continue
            try:
                number = float(value)
                if math.isfinite(number):
                    finite += 1
                else:
                    invalid += 1
            except ValueError:
                invalid += 1
        result[header] = {
            "missing": missing,
            "finite_numeric": finite,
            "invalid_non_numeric": invalid,
        }
    return result


def require_files(paths):
    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        raise FileNotFoundError("Required input files missing:\n" + "\n".join(missing))


def process_osd654(report):
    folder = RAW / "OSD-654"
    source = folder / "LSDS-66_microCT_uCT_TRANSFORMED.csv"
    metadata_zip = folder / "OSD-654_metadata_OSD-654-ISA.zip"
    require_files([source, metadata_zip])

    headers, rows = read_csv(source)
    metadata = read_metadata(
        metadata_zip,
        "s_OSD-654.txt",
    )

    measurements = [h for h in headers if h != "Sample Name"]
    required_meta = [
        "Sample Name",
        "Characteristics[Organism]",
        "Characteristics[Strain]",
        "Factor Value[Genotype]",
        "Characteristics[sex]",
        "Characteristics[Age at Experiment Start]",
        "Characteristics[duration]",
        "Factor Value[Spaceflight]",
        "Factor Value[Space Mission]",
    ]

    if "Sample Name" not in headers:
        raise ValueError("OSD-654 CSV is missing Sample Name")
    if any(h not in metadata[0] for h in required_meta):
        raise ValueError("OSD-654 metadata is missing expected fields")

    meta_by_id = {m["Sample Name"]: m for m in metadata}
    ids = [r["Sample Name"] for r in rows]

    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate OSD-654 sample IDs")
    unmatched = [sid for sid in ids if sid not in meta_by_id]
    if unmatched:
        raise ValueError(f"OSD-654 samples missing metadata: {unmatched}")

    output_headers = [
        "sample_id", "organism", "strain", "genotype", "sex",
        "age_at_experiment_start", "duration",
        "experimental_condition", "mission",
        *measurements, "measurement_complete",
    ]

    output_rows = []
    for row in rows:
        meta = meta_by_id[row["Sample Name"]]
        values = {m: row.get(m, "") for m in measurements}
        complete = all(str(v).strip() for v in values.values())
        output_rows.append({
            "sample_id": row["Sample Name"],
            "organism": meta.get("Characteristics[Organism]", ""),
            "strain": meta.get("Characteristics[Strain]", ""),
            "genotype": meta.get("Factor Value[Genotype]", ""),
            "sex": meta.get("Characteristics[sex]", ""),
            "age_at_experiment_start": meta.get(
                "Characteristics[Age at Experiment Start]", ""
            ),
            "duration": meta.get("Characteristics[duration]", ""),
            "experimental_condition": meta.get("Factor Value[Spaceflight]", ""),
            "mission": meta.get("Factor Value[Space Mission]", ""),
            **values,
            "measurement_complete": str(complete).lower(),
        })

    destination = OUT / "OSD-654/OSD-654_microCT_with_metadata.csv"
    write_csv(destination, output_headers, output_rows)

    metadata_only = sorted(set(meta_by_id) - set(ids))
    report["OSD-654"] = {
        "source_sha256": sha256(source),
        "processed_sha256": sha256(destination),
        "source_rows": len(rows),
        "processed_rows": len(output_rows),
        "measurement_columns": measurements,
        "metadata_rows": len(metadata),
        "metadata_only_sample_ids": metadata_only,
        "unmatched_measurement_ids": unmatched,
        "incomplete_samples": [
            r["sample_id"] for r in output_rows
            if r["measurement_complete"] == "false"
        ],
        "measurement_values": numeric_summary(
            measurements, rows, skip=("Sample Name",)
        ),
        "status": "PASS",
    }


def process_osd684(report):
    folder = RAW / "OSD-684"
    counts = folder / "GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv"
    differential = folder / "GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv"
    sample_table = folder / "GLDS-615_rna_seq_SampleTable_GLbulkRNAseq.csv"
    contrasts = folder / "GLDS-615_rna_seq_contrasts_GLbulkRNAseq.csv"
    metadata_zip = folder / "OSD-684_metadata_OSD-684-ISA.zip"
    require_files([counts, differential, sample_table, contrasts, metadata_zip])

    metadata = read_metadata(metadata_zip, "s_OSD-684.txt")
    meta_fields = [
        "Sample Name",
        "Characteristics[Organism]",
        "Characteristics[Sex]",
        "Characteristics[Primary Cell Source]",
        "Factor Value[Donor Age]",
        "Factor Value[Spaceflight]",
    ]
    if not metadata or any(k not in metadata[0] for k in meta_fields):
        raise ValueError("OSD-684 metadata is missing expected fields")

    sample_rows = []
    for m in metadata:
        sample_rows.append({
            "sample_id": m["Sample Name"],
            "organism": m.get("Characteristics[Organism]", ""),
            "sex": m.get("Characteristics[Sex]", ""),
            "tissue": m.get("Characteristics[Primary Cell Source]", ""),
            "donor_age_group": m.get("Factor Value[Donor Age]", ""),
            "condition": m.get("Factor Value[Spaceflight]", ""),
        })

    sample_dest = OUT / "OSD-684/OSD-684_sample_metadata.csv"
    write_csv(sample_dest, list(sample_rows[0]), sample_rows)

    count_headers, count_rows = read_csv(counts)
    if not count_headers:
        raise ValueError("Normalized counts file has no headers")

    count_sample_ids = count_headers[1:]
    metadata_ids = [r["sample_id"] for r in sample_rows]
    alignment = count_sample_ids == metadata_ids
    if not alignment:
        raise ValueError(
            "OSD-684 sample IDs/order do not match normalized-count columns.\n"
            f"Count columns: {count_sample_ids}\nMetadata IDs: {metadata_ids}"
        )

    outputs = {}
    for source, name in [
        (counts, "OSD-684_normalized_counts.csv"),
        (differential, "OSD-684_differential_expression.csv"),
        (contrasts, "OSD-684_contrasts.csv"),
    ]:
        headers, data = read_csv(source)
        destination = OUT / "OSD-684" / name
        write_csv(destination, headers, data)
        outputs[name] = {
            "source_sha256": sha256(source),
            "processed_sha256": sha256(destination),
            "rows": len(data),
            "columns": len(headers),
        }

    condition_counts = dict(Counter(r["condition"] for r in sample_rows))
    report["OSD-684"] = {
        "metadata_rows": len(sample_rows),
        "sample_metadata_sha256": sha256(sample_dest),
        "normalized_count_sample_ids_match_metadata": alignment,
        "condition_counts": condition_counts,
        "outputs": outputs,
        "normalized_counts_numeric_check": numeric_summary(
            count_headers, count_rows, skip=(count_headers[0],)
        ),
        "differential_expression_missing_values": {
            k: v["missing"] for k, v in numeric_summary(
                *read_csv(differential),
                skip=("ENSEMBL", "SYMBOL", "GENENAME", "REFSEQ",
                      "ENTREZID", "STRING_id", "GOSLIM_IDS")
            ).items() if v["missing"]
        },
        "NA_values_preserved": True,
        "status": "PASS",
    }


def main():
    report = {
        "project": "Junior Astronaut Mission Trainer",
        "processing_scope": "OSDR datasets only",
        "raw_files_modified": False,
    }

    process_osd654(report)
    process_osd684(report)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("OSDR preprocessing completed.")
    for study, details in report.items():
        if isinstance(details, dict) and "status" in details:
            print(f"{study}: {details['status']}")
    print(f"OSD-654 processed rows: {report['OSD-654']['processed_rows']}")
    print(f"OSD-654 incomplete samples: {report['OSD-654']['incomplete_samples']}")
    print(f"OSD-684 metadata rows: {report['OSD-684']['metadata_rows']}")
    print(f"OSD-684 sample alignment: "
          f"{report['OSD-684']['normalized_count_sample_ids_match_metadata']}")
    print(f"Report: {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
