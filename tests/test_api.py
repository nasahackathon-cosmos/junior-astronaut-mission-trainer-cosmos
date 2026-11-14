"""Integration tests for the Junior Astronaut Mission Trainer API."""

import unittest

from fastapi.testclient import TestClient

from backend.main import app


class MissionAPITests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_all_100_missions(self):
        response = self.client.get("/api/missions")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 100)
        self.assertEqual(len(response.json()["missions"]), 100)

    def test_mission_detail(self):
        response = self.client.get("/api/missions/M053")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mission_id"], "M053")

    def test_m053_primary_evidence(self):
        response = self.client.get("/api/missions/M053/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["evidence_status"], "mapped")
        self.assertEqual(result["evidence"][0]["source_id"], "OSD-654")
        self.assertEqual(result["evidence"][0]["evidence_role"], "primary_direct")
        self.assertIn("mouse", " ".join(
            result["evidence"][0]["source"]["limitations"]
        ).lower())

    def test_m054_primary_evidence(self):
        response = self.client.get("/api/missions/M054/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["evidence_status"], "mapped")
        self.assertEqual(result["evidence"][0]["source_id"], "OSD-684")

    def test_unmapped_mission(self):
        response = self.client.get("/api/missions/M001/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["overall_evidence_status"], "not_mapped")
        self.assertEqual(result["evidence"], [])
        self.assertEqual(result["radlab_evidence"], [])

    def test_m032_returns_artemis_radlab_evidence(self):
        response = self.client.get("/api/missions/M032/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()

        self.assertEqual(result["evidence_status"], "not_mapped")
        self.assertEqual(result["overall_evidence_status"], "mapped")
        self.assertEqual(len(result["radlab_evidence"]), 3)

        source_ids = {
            item["source_id"] for item in result["radlab_evidence"]
        }
        self.assertEqual(source_ids, {
            "RADLAB-ARTEMIS-INNER-2022",
            "RADLAB-ARTEMIS-OUTER-2022",
            "RADLAB-ARTEMIS-LUNAR-FLYBYS-2022",
        })

    def test_m035_returns_radlab_evidence(self):
        response = self.client.get("/api/missions/M035/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(len(result["radlab_evidence"]), 3)

    def test_m036_returns_supporting_radlab_evidence(self):
        response = self.client.get("/api/missions/M036/evidence")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(len(result["radlab_evidence"]), 3)
        self.assertTrue(all(
            item["evidence_role"] == "supporting"
            for item in result["radlab_evidence"]
        ))

    def test_unknown_mission_returns_404(self):
        response = self.client.get("/api/missions/M999")
        self.assertEqual(response.status_code, 404)

    def test_data_summary(self):
        response = self.client.get("/api/data-summary")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["mission_count"], 100)
        self.assertEqual(result["osdr_source_count"], 2)
        self.assertEqual(result["mapped_mission_count"], 9)
        self.assertEqual(result["radlab_source_count"], 3)
        self.assertEqual(result["radlab_mapped_mission_count"], 3)
        self.assertEqual(result["overall_mapped_mission_count"], 12)


if __name__ == "__main__":
    unittest.main()
