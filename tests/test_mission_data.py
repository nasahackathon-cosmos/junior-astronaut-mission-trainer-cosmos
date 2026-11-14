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

    def test_m054_has_primary_osdr_evidence(self):
        result = get_mission_evidence("M054")
        self.assertEqual(result["evidence_status"], "mapped")
        self.assertEqual(result["evidence"][0]["source_id"], "OSD-684")

    def test_unmapped_mission_is_not_misrepresented(self):
        result = get_mission_evidence("M001")
        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["evidence"], [])

    def test_source_limitations_are_available(self):
        result = get_mission_evidence("M053")
        source = result["evidence"][0]["source"]
        self.assertTrue(source["limitations"])
        self.assertTrue(
            any("mouse" in item.lower() for item in source["limitations"]),
            "Expected the OSD-654 limitations to identify mouse research.",
        )

    def test_summary(self):
        summary = get_data_summary()
        self.assertEqual(summary["mission_count"], 100)
        self.assertEqual(summary["osdr_source_count"], 2)
        self.assertEqual(summary["mapped_mission_count"], 9)

    def test_crosswalk_references_are_valid(self):
        data = load_mission_data()
        mission_ids = {
            item["mission_id"] for item in data["catalogue"]["missions"]
        }
        source_ids = {
            item["source_id"] for item in data["crosswalk"]["sources"]
        }

        for mapping in data["crosswalk"]["mappings"]:
            self.assertIn(mapping["mission_id"], mission_ids)
            for source_id in mapping["source_ids"]:
                self.assertIn(source_id, source_ids)


if __name__ == "__main__":
    unittest.main()
