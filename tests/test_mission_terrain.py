import tempfile
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.main import app as main_app
from backend.terrain.mission_routes import create_mission_terrain_router
from backend.terrain.repository import TerrainRepository
from backend.terrain_config import TerrainSettings
from backend.terrain_registry import DATASET_REGISTRY


class MissionTerrainRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.main_client = TestClient(main_app)

    def test_successful_bounded_analysis(self):
        response = self.main_client.get(
            "/api/missions/M009/terrain-analysis",
            params={
                "south": 19.7,
                "north": 19.8,
                "west": 76.51,
                "east": 76.6,
                "stride": 100,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["mission_id"], "M009")
        self.assertEqual(body["association_type"], "regional_context")
        self.assertIsNone(body["exact_coordinates"])
        self.assertEqual({item["dataset_id"] for item in body["datasets"]}, {
            "elevation", "slope", "classification",
        })
        self.assertTrue(all("summary" in item for item in body["datasets"]))

    def test_analysis_rejects_bounds_without_grid_cells(self):
        response = self.main_client.get(
            "/api/missions/M009/terrain-analysis",
            params={
                "south": 19.799,
                "north": 19.801,
                "west": 76.504,
                "east": 76.505,
            },
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"]["error"],
            "empty_grid_selection",
        )

    def test_context_distinguishes_regional_association_from_coordinates(self):
        response = self.main_client.get("/api/missions/M009/terrain-context")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["terrain_status"], "mapped")
        self.assertEqual(body["association_type"], "regional_context")
        self.assertIsNone(body["exact_coordinates"])
        self.assertIn("does not provide an exact", body["coordinate_note"])

    def test_mission_without_mapping_is_graceful(self):
        response = self.main_client.get("/api/missions/M001/terrain-analysis")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["terrain_status"], "not_mapped")
        self.assertIsNone(body["association_type"])
        self.assertIsNone(body["exact_coordinates"])
        self.assertNotIn("coordinate_note", body)
        self.assertNotIn("region", body)

    def test_invalid_mission_id_returns_not_found(self):
        response = self.main_client.get("/api/missions/M999/terrain-context")
        self.assertEqual(response.status_code, 404)

    def test_analysis_requires_bounds_for_mapped_mission(self):
        response = self.main_client.get("/api/missions/M009/terrain-analysis")
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["error"], "missing_bounds")

    def test_missing_terrain_file_returns_safe_error(self):
        with tempfile.TemporaryDirectory() as directory:
            settings = TerrainSettings(data_root=Path(directory))
            repository = TerrainRepository(settings, DATASET_REGISTRY)
            app = FastAPI()
            app.include_router(create_mission_terrain_router(repository, settings))

            response = TestClient(app).get(
                "/api/missions/M009/terrain-analysis",
                params={
                    "south": 19.7,
                    "north": 19.8,
                    "west": 76.51,
                    "east": 76.6,
                    "stride": 100,
                },
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["error"], "terrain_data_unavailable")
        self.assertNotIn(directory, response.text)

    def test_bounded_response_and_query_limits(self):
        small_settings = TerrainSettings(
            data_root=Path(__file__).resolve().parents[1] / "data" / "processed" / "mars_trek",
            max_query_points=1,
            max_response_bytes=100,
        )
        repository = TerrainRepository(small_settings, DATASET_REGISTRY)
        app = FastAPI()
        app.include_router(create_mission_terrain_router(repository, small_settings))
        client = TestClient(app)

        response = client.get(
            "/api/missions/M009/terrain-analysis",
            params={
                "south": 19.7,
                "north": 19.8,
                "west": 76.51,
                "east": 76.6,
                "stride": 100,
            },
        )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"]["error"], "terrain_response_too_large")


if __name__ == "__main__":
    unittest.main()
