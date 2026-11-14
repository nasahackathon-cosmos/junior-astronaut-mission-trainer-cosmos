import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.mission_data import (
    get_data_summary,
    get_mission,
    get_mission_evidence,
    list_missions,
    load_mission_data,
)
from backend import mission_data


class MissionDataTests(unittest.TestCase):

    def test_all_100_missions_load(self):
        missions = list_missions()
        self.assertEqual(len(missions), 100)
        self.assertEqual(
            [m["mission_id"] for m in missions],
            [f"M{i:03d}" for i in range(1, 101)],
        )

    def test_every_mission_has_required_content(self):
        for mission in list_missions():
            with self.subTest(mission=mission["mission_id"]):
                self.assertTrue(mission["title"])
                self.assertTrue(mission["gameplay"])
                self.assertTrue(mission["scientific_correction"])

    def test_known_mission_lookup(self):
        mission = get_mission("M053")
        self.assertIsNotNone(mission)
        self.assertEqual(mission["title"], "Bone health investigation")

    def test_unknown_mission_lookup(self):
        self.assertIsNone(get_mission("M999"))
        self.assertIsNone(get_mission_evidence("M999"))

    def test_m053_has_primary_osdr_evidence(self):
        result = get_mission_evidence("M053")
        self.assertEqual(result["evidence_status"], "mapped")
        self.assertEqual(len(result["evidence"]), 1)
        self.assertEqual(result["evidence"][0]["source_id"], "OSD-654")
        self.assertEqual(
            result["evidence"][0]["evidence_role"], "primary_direct"
        )
        self.assertEqual(result["radlab_evidence"], [])

    def test_m054_has_primary_osdr_evidence(self):
        result = get_mission_evidence("M054")
        self.assertEqual(result["evidence_status"], "mapped")
        self.assertEqual(result["evidence"][0]["source_id"], "OSD-684")

    def test_unmapped_mission_is_not_misrepresented(self):
        result = get_mission_evidence("M001")
        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["overall_evidence_status"], "not_mapped")
        self.assertEqual(result["evidence"], [])
        self.assertEqual(result["radlab_evidence"], [])

    def test_m032_has_three_primary_radlab_sources(self):
        result = get_mission_evidence("M032")
        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["overall_evidence_status"], "mapped")
        self.assertEqual(result["evidence"], [])
        self.assertEqual(len(result["radlab_evidence"]), 3)
        self.assertEqual(
            {item["evidence_role"] for item in result["radlab_evidence"]},
            {"primary_direct"},
        )
        self.assertEqual(
            result["available_evidence_sources"], ["radlab"]
        )

    def test_m035_has_three_primary_radlab_sources(self):
        result = get_mission_evidence("M035")
        self.assertEqual(len(result["radlab_evidence"]), 3)
        self.assertEqual(
            {item["evidence_role"] for item in result["radlab_evidence"]},
            {"primary_direct"},
        )

    def test_m036_has_three_supporting_radlab_sources(self):
        result = get_mission_evidence("M036")
        self.assertEqual(len(result["radlab_evidence"]), 3)
        self.assertEqual(
            {item["evidence_role"] for item in result["radlab_evidence"]},
            {"supporting"},
        )

    def test_radlab_sources_preserve_record_granularity(self):
        result = get_mission_evidence("M032")
        sources = {
            item["source_id"]: item["source"]
            for item in result["radlab_evidence"]
        }

        inner = sources["RADLAB-ARTEMIS-INNER-2022"]
        outer = sources["RADLAB-ARTEMIS-OUTER-2022"]
        lunar = sources["RADLAB-ARTEMIS-LUNAR-FLYBYS-2022"]

        self.assertEqual(
            inner["record_granularity"], "instrument_peak_summary"
        )
        self.assertEqual(inner["summary_record_count"], 4)
        self.assertEqual(outer["record_granularity"], "individual_time_series_readings")
        self.assertEqual(lunar["record_granularity"], "individual_time_series_readings")

    def test_radlab_source_limitations_are_available(self):
        result = get_mission_evidence("M032")
        for item in result["radlab_evidence"]:
            with self.subTest(source=item["source_id"]):
                self.assertTrue(item["mapping_limitations"])
                self.assertTrue(item["source"]["limitations"])

    def test_radlab_simulation_boundary_is_available(self):
        result = get_mission_evidence("M036")
        boundary = result["simulation_boundaries"]["radlab"]
        self.assertTrue(boundary)
        self.assertTrue(
            any("uncrewed" in item.lower() for item in boundary)
        )

    def test_source_limitations_are_available(self):
        result = get_mission_evidence("M053")
        source = result["evidence"][0]["source"]
        self.assertTrue(source["limitations"])
        self.assertTrue(
            any("mouse" in item.lower() for item in source["limitations"]),
            "Expected the OSD-654 limitations to identify mouse research.",
        )

    def test_summary_preserves_old_fields_and_adds_radlab_and_csa(self):
        summary = get_data_summary()
        self.assertEqual(summary["mission_count"], 100)
        self.assertEqual(summary["osdr_source_count"], 2)
        self.assertEqual(summary["mapped_mission_count"], 9)
        self.assertEqual(summary["radlab_source_count"], 3)
        self.assertEqual(summary["radlab_mapped_mission_count"], 3)
        self.assertEqual(
            summary["radlab_mapped_mission_ids"],
            ["M032", "M035", "M036"],
        )
        self.assertEqual(summary["csa_source_count"], 7)
        self.assertEqual(summary["csa_mapped_mission_count"], 10)
        self.assertEqual(
            summary["csa_mapped_mission_ids"],
            [
                "M013", "M016", "M018", "M028", "M047",
                "M052", "M057", "M058", "M084", "M086",
            ],
        )
        self.assertEqual(summary["overall_mapped_mission_count"], 28)

    def test_mola_mapping_loads_successfully(self):
        mapping = load_mission_data()["mola_mapping"]
        self.assertEqual(mapping["module"], "MOLA Jezero Terrain Module")
        self.assertEqual(mapping["mission_count"], len(mapping["missions"]))

    def test_mola_has_exactly_ten_mappings(self):
        self.assertEqual(len(load_mission_data()["mola_mapping"]["missions"]), 10)

    def test_all_mola_missions_exist_in_catalogue(self):
        data = load_mission_data()
        catalogue_ids = {item["mission_id"] for item in data["catalogue"]["missions"]}
        mola_ids = {item["mission_id"] for item in data["mola_mapping"]["missions"]}
        self.assertEqual(len(mola_ids), 10)
        self.assertTrue(mola_ids <= catalogue_ids)

    def test_mola_mission_ids_are_unique(self):
        missions = load_mission_data()["mola_mapping"]["missions"]
        ids = [item["mission_id"] for item in missions]
        self.assertEqual(len(ids), len(set(ids)))

    def test_all_mola_dataset_files_exist(self):
        data = load_mission_data()
        for mapping in data["mola_mapping"]["missions"]:
            for filename in mapping["datasets"]:
                self.assertTrue((mission_data.MARS_TREK_DATA_DIR / filename).is_file())

    def test_m009_returns_mola_evidence(self):
        result = get_mission_evidence("M009")
        self.assertEqual(len(result["mola_evidence"]), 1)
        self.assertEqual(result["mola_evidence"][0]["mission_id"], "M009")
        self.assertIn("mola", result["evidence_by_source"])
        self.assertIn("mola", result["available_evidence_sources"])

    def test_m077_returns_mola_evidence(self):
        item = get_mission_evidence("M077")["mola_evidence"][0]
        self.assertEqual(item["title"], "Terrain-aware rover navigation")
        self.assertTrue(item["datasets"])
        self.assertTrue(item["usage"])
        self.assertTrue(item["limitation"])
        self.assertTrue(item["data_type"])

    def test_unmapped_mission_has_empty_mola_evidence(self):
        self.assertEqual(get_mission_evidence("M001")["mola_evidence"], [])

    def test_mola_limitations_coverage_and_categories_are_exposed(self):
        result = get_mission_evidence("M009")
        self.assertTrue(result["simulation_boundaries"]["mola"])
        self.assertEqual(result["mola_context"]["region"], "Jezero Crater, Mars")
        self.assertEqual(result["mola_context"]["coverage"]["longitude_approx"], [76.5, 78.5])
        self.assertEqual(result["mola_context"]["terrain_categories"]["flat"], "0 to 5 degrees")
        self.assertTrue(result["mola_evidence"][0]["limitation"])

    def _load_with_modified_mola(self, modify):
        with mission_data.MOLA_MAPPING_FILE.open(encoding="utf-8") as handle:
            mapping = json.load(handle)
        modify(mapping)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "mola.json"
            path.write_text(json.dumps(mapping), encoding="utf-8")
            with patch.object(mission_data, "MOLA_MAPPING_FILE", path):
                return load_mission_data()

    def test_invalid_mola_mapping_count_raises(self):
        with self.assertRaises(mission_data.MissionDataError):
            self._load_with_modified_mola(lambda mapping: mapping.update({"mission_count": 9}))

    def test_invalid_mola_mission_reference_raises(self):
        def change(mapping):
            mapping["missions"][0]["mission_id"] = "M999"
        with self.assertRaises(mission_data.MissionDataError):
            self._load_with_modified_mola(change)

    def test_invalid_mola_dataset_reference_raises(self):
        def change(mapping):
            mapping["missions"][0]["datasets"] = ["../not-in-mars-trek.json"]
        with self.assertRaises(mission_data.MissionDataError):
            self._load_with_modified_mola(change)

    def test_existing_sources_remain_available_with_mola(self):
        m053 = get_mission_evidence("M053")
        self.assertEqual(m053["evidence"][0]["source_id"], "OSD-654")
        self.assertEqual(m053["radlab_evidence"], [])
        self.assertEqual(m053["csa_evidence"], [])
        self.assertEqual(get_mission_evidence("M032")["mola_evidence"], [])

    def test_csa_datasets_are_loaded_with_original_records(self):
        data = load_mission_data()
        crosswalk = data["csa_crosswalk"]

        self.assertEqual(len(crosswalk["sources"]), 7)

        total_records = 0
        for source in crosswalk["sources"]:
            with self.subTest(source=source["source_id"]):
                dataset = source["dataset"]
                self.assertIsInstance(dataset["records"], list)
                self.assertTrue(dataset["records"])
                total_records += len(dataset["records"])

        self.assertEqual(total_records, 38)

    def test_m047_has_direct_csa_water_and_lunar_references(self):
        result = get_mission_evidence("M047")
        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["overall_evidence_status"], "mapped")
        self.assertEqual(
            {item["source_id"] for item in result["csa_evidence"]},
            {"CSA-WATER-MANAGEMENT", "CSA-LUNAR-AGRICULTURE"},
        )
        self.assertTrue(all(
            item["evidence_role"] == "direct_reference"
            for item in result["csa_evidence"]
        ))
        self.assertIn("csa", result["evidence_by_source"])
        self.assertIn("csa", result["available_evidence_sources"])
        self.assertTrue(result["simulation_boundaries"]["csa"])

    def test_m086_csa_mapping_is_limited_to_water_recycling(self):
        result = get_mission_evidence("M086")
        self.assertEqual(len(result["csa_evidence"]), 1)

        item = result["csa_evidence"][0]
        self.assertEqual(item["source_id"], "CSA-WATER-MANAGEMENT")
        self.assertEqual(item["evidence_role"], "supporting")
        self.assertTrue(any(
            "waste sorting" in limitation.lower()
            for limitation in item["mapping_limitations"]
        ))

    def test_csa_plant_missions_have_direct_references(self):
        for mission_id in ("M013", "M052", "M057", "M084"):
            with self.subTest(mission=mission_id):
                result = get_mission_evidence(mission_id)
                self.assertTrue(result["csa_evidence"])
                self.assertTrue(all(
                    item["evidence_role"] == "direct_reference"
                    for item in result["csa_evidence"]
                ))

    def test_csa_nutrition_missions_are_background_only(self):
        for mission_id in ("M018", "M058"):
            with self.subTest(mission=mission_id):
                result = get_mission_evidence(mission_id)
                self.assertEqual(
                    {item["evidence_role"] for item in result["csa_evidence"]},
                    {"background_only"},
                )

    def test_m028_csa_mapping_is_optional(self):
        result = get_mission_evidence("M028")
        self.assertTrue(result["csa_evidence"])
        self.assertTrue(all(
            item["evidence_role"] == "optional"
            for item in result["csa_evidence"]
        ))

    def test_both_crosswalks_reference_valid_missions_and_sources(self):
        data = load_mission_data()
        mission_ids = {
            item["mission_id"] for item in data["catalogue"]["missions"]
        }

        for key in ("crosswalk", "radlab_crosswalk", "csa_crosswalk"):
            crosswalk = data[key]
            source_ids = {
                item["source_id"] for item in crosswalk["sources"]
            }

            for mapping in crosswalk["mappings"]:
                self.assertIn(mapping["mission_id"], mission_ids)
                for source_id in mapping["source_ids"]:
                    self.assertIn(source_id, source_ids)


if __name__ == "__main__":
    unittest.main()
