import csv
import hashlib
import json
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/osdr"
PROCESSED = ROOT / "data/processed/osdr"
REPORT = ROOT / "docs/reports/osdr_processing_report.json"


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return [h.strip() for h in reader.fieldnames], list(reader)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class TestOSDRProcessing(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.report = json.loads(REPORT.read_text(encoding="utf-8"))

    def test_report_status_and_raw_protection(self):
        self.assertFalse(self.report["raw_files_modified"])
        self.assertEqual(self.report["OSD-654"]["status"], "PASS")
        self.assertEqual(self.report["OSD-684"]["status"], "PASS")

    def test_osd654_dimensions_and_sample_ids(self):
        path = PROCESSED / "OSD-654/OSD-654_microCT_with_metadata.csv"
        headers, rows = read_csv(path)

        self.assertEqual(len(rows), 25)
        self.assertEqual(len(headers), 19)

        ids = [r["sample_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), set(
            r["sample_id"] for r in rows
        ))

    def test_osd654_incomplete_sample_is_preserved(self):
        path = PROCESSED / "OSD-654/OSD-654_microCT_with_metadata.csv"
        _, rows = read_csv(path)

        incomplete = [
            r for r in rows if r["measurement_complete"] == "false"
        ]
        self.assertEqual([r["sample_id"] for r in incomplete], ["F18"])

        measurements = [
            h for h in rows[0]
            if h not in {
                "sample_id", "organism", "strain", "genotype", "sex",
                "age_at_experiment_start", "duration",
                "experimental_condition", "mission",
                "measurement_complete",
            }
        ]
        self.assertTrue(all(not incomplete[0][m].strip() for m in measurements))

    def test_osd654_metadata_only_samples_are_not_added(self):
        details = self.report["OSD-654"]
        self.assertEqual(details["processed_rows"], 25)
        self.assertEqual(len(details["metadata_only_sample_ids"]), 10)
        self.assertEqual(details["unmatched_measurement_ids"], [])

    def test_osd684_dimensions(self):
        expected = {
            "OSD-684_sample_metadata.csv": (12, 6),
            "OSD-684_normalized_counts.csv": (22771, 13),
            "OSD-684_differential_expression.csv": (22771, 78),
            "OSD-684_contrasts.csv": (2, 13),
        }

        for filename, shape in expected.items():
            with self.subTest(file=filename):
                headers, rows = read_csv(PROCESSED / "OSD-684" / filename)
                self.assertEqual((len(rows), len(headers)), shape)

    def test_osd684_sample_alignment(self):
        _, metadata = read_csv(
            PROCESSED / "OSD-684/OSD-684_sample_metadata.csv"
        )
        count_headers, _ = read_csv(
            PROCESSED / "OSD-684/OSD-684_normalized_counts.csv"
        )

        self.assertEqual(
            [r["sample_id"] for r in metadata],
            count_headers[1:],
        )
        self.assertTrue(
            self.report["OSD-684"]["normalized_count_sample_ids_match_metadata"]
        )

    def test_osd684_four_age_condition_groups(self):
        _, metadata = read_csv(
            PROCESSED / "OSD-684/OSD-684_sample_metadata.csv"
        )
        groups = Counter(
            (r["donor_age_group"], r["condition"]) for r in metadata
        )

        self.assertEqual(len(groups), 4)
        self.assertEqual(sorted(groups.values()), [3, 3, 3, 3])

    def test_osd684_na_values_are_preserved(self):
        raw = RAW / "OSD-684/GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv"
        processed = PROCESSED / "OSD-684/OSD-684_differential_expression.csv"

        new_headers, new_rows = read_csv(processed)

        # Raw source comparison is available in the private repository.
        # The public release intentionally excludes raw research inputs.
        if raw.is_file():
            raw_headers, raw_rows = read_csv(raw)
            self.assertEqual(raw_headers, new_headers)
            self.assertEqual(raw_rows, new_rows)

        # This processed-data check runs in both repositories.
        self.assertTrue(any(
            "NA" in row.values() for row in new_rows
        ))

    def test_osd684_normalized_values_are_preserved(self):
        raw = RAW / "OSD-684/GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv"
        processed = PROCESSED / "OSD-684/OSD-684_normalized_counts.csv"

        if not raw.is_file():
            self.skipTest(
                "Raw OSDR source CSV is excluded from the public release"
            )

        raw_headers, raw_rows = read_csv(raw)
        new_headers, new_rows = read_csv(processed)

        self.assertEqual(raw_headers, new_headers)
        self.assertEqual(raw_rows, new_rows)

    def test_source_hashes_match_processing_report(self):
        checks = [
            (
                RAW / "OSD-654/LSDS-66_microCT_uCT_TRANSFORMED.csv",
                self.report["OSD-654"]["source_sha256"],
            ),
            (
                RAW / "OSD-684/GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv",
                self.report["OSD-684"]["outputs"]["OSD-684_normalized_counts.csv"]["source_sha256"],
            ),
            (
                RAW / "OSD-684/GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv",
                self.report["OSD-684"]["outputs"]["OSD-684_differential_expression.csv"]["source_sha256"],
            ),
        ]

        available_checks = [
            (path, expected_hash)
            for path, expected_hash in checks
            if path.is_file()
        ]

        if not available_checks:
            self.skipTest(
                "Raw OSDR source files are excluded from the public release"
            )

        for path, expected_hash in available_checks:
            with self.subTest(file=path.name):
                self.assertEqual(sha256(path), expected_hash)


if __name__ == "__main__":
    unittest.main(verbosity=2)
