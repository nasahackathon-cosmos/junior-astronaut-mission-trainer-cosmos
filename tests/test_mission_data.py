import unittest

from src.backend.mission_data import (
    get_data_summary,
    get_mission,
    get_mission_evidence,
    list_missions,
    load_mission_data,
)


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

    def test_summary_preserves_old_fields_and_adds_radlab(self):
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
        self.assertEqual(summary["overall_mapped_mission_count"], 12)

    def test_both_crosswalks_reference_valid_missions_and_sources(self):
        data = load_mission_data()
        mission_ids = {
            item["mission_id"] for item in data["catalogue"]["missions"]
        }

        for key in ("crosswalk", "radlab_crosswalk"):
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
