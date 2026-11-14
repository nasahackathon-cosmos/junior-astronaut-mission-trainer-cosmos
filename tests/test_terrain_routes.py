import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.main import app as main_app
from backend.terrain.repository import TerrainRepository
from backend.terrain.routes import create_terrain_router
from backend.terrain_config import TerrainSettings
from backend.terrain_registry import DATASET_REGISTRY


ROWS, COLUMNS = 296, 257
SOUTH, NORTH, WEST, EAST = 17.49845382, 19.8030663, 76.50336905, 78.50330394
LATITUDES = [NORTH - row * (NORTH - SOUTH) / (ROWS - 1) for row in range(ROWS)]
LONGITUDES = [WEST + column * (EAST - WEST) / (COLUMNS - 1) for column in range(COLUMNS)]


class TerrainRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        root = Path(cls.directory.name)
        cls.spec = replace(DATASET_REGISTRY["elevation"], filename="fixture.json")
        cls.rgb_spec = replace(DATASET_REGISTRY["roughness"], filename="roughness.json")
        payload = {
            "rows": ROWS,
            "columns": COLUMNS,
            "latitudes": LATITUDES,
            "longitudes": LONGITUDES,
            "elevations_m": [[row * COLUMNS + column for column in range(COLUMNS)] for row in range(ROWS)],
        }
        (root / "fixture.json").write_text(json.dumps(payload), encoding="utf-8")
        rgb_payload = {
            "rows": ROWS,
            "columns": COLUMNS,
            "latitudes": LATITUDES,
            "longitudes": LONGITUDES,
            "roughness": {
                "blue_0_6km": [[1] * COLUMNS for _ in range(ROWS)],
                "green_2_4km": [[2] * COLUMNS for _ in range(ROWS)],
                "red_9_2km": [[3] * COLUMNS for _ in range(ROWS)],
            },
        }
        (root / "roughness.json").write_text(json.dumps(rgb_payload), encoding="utf-8")
        cls.settings = TerrainSettings(data_root=root, max_query_points=4, max_response_bytes=20_000)
        cls.registry = {"fixture": cls.spec, "rgb": cls.rgb_spec}
        cls.repository = TerrainRepository(cls.settings, cls.registry)
        app = FastAPI()
        app.include_router(create_terrain_router(cls.repository, cls.settings, cls.registry))
        cls.client = TestClient(app)
        cls.main_client = TestClient(main_app)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def test_catalogue_and_metadata(self):
        catalogue = self.client.get("/api/terrain").json()
        self.assertEqual(catalogue["count"], 2)
        self.assertEqual(catalogue["datasets"][0]["dataset_id"], "elevation")
        metadata = self.client.get("/api/terrain/fixture")
        self.assertEqual(metadata.status_code, 200)
        self.assertEqual(metadata.json()["units"], "m")
        self.assertNotIn("fixture.json", metadata.text)

    def test_router_is_registered_on_main_app(self):
        response = self.main_client.get("/api/terrain")
        self.assertEqual(response.status_code, 200)
        self.assertIn("elevation", {item["dataset_id"] for item in response.json()["datasets"]})

    def test_point_lookup_and_boundaries(self):
        response = self.client.get(
            "/api/terrain/fixture/point",
            params={"latitude": NORTH, "longitude": WEST},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["value"], 0)

    def test_invalid_and_out_of_coverage_coordinates(self):
        response = self.client.get(
            "/api/terrain/fixture/point",
            params={"latitude": SOUTH - 1, "longitude": WEST},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["error"], "coordinate_out_of_coverage")

        response = self.client.get(
            "/api/terrain/fixture/point",
            params={"latitude": "nan", "longitude": WEST},
        )
        self.assertEqual(response.status_code, 422)

    def test_missing_terrain_file_returns_safe_service_error(self):
        missing_spec = replace(self.spec, filename="missing.json")
        repository = TerrainRepository(self.settings, {"missing": missing_spec})
        app = FastAPI()
        app.include_router(create_terrain_router(repository, self.settings, {"missing": missing_spec}))

        response = TestClient(app).get(
            "/api/terrain/missing/point",
            params={"latitude": NORTH, "longitude": WEST},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["error"], "terrain_data_unavailable")
        self.assertNotIn(str(self.directory.name), response.text)

    def test_malformed_terrain_json_returns_safe_service_error(self):
        malformed = Path(self.directory.name) / "malformed.json"
        malformed.write_text("{not valid json", encoding="utf-8")
        malformed_spec = replace(self.spec, filename=malformed.name)
        repository = TerrainRepository(self.settings, {"malformed": malformed_spec})
        app = FastAPI()
        app.include_router(create_terrain_router(repository, self.settings, {"malformed": malformed_spec}))

        response = TestClient(app).get(
            "/api/terrain/malformed/point",
            params={"latitude": NORTH, "longitude": WEST},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["error"], "terrain_data_invalid")
        self.assertNotIn(str(self.directory.name), response.text)

    def test_bounded_window_and_stride(self):
        response = self.client.get(
            "/api/terrain/fixture/window",
            params={"south": 19.78, "north": NORTH, "west": WEST, "east": 76.53, "stride": 100},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["stride"], 100)
        self.assertLessEqual(body["dimensions"]["rows"] * body["dimensions"]["columns"], 4)

    def test_window_rejects_bounds_without_grid_cells(self):
        response = self.client.get(
            "/api/terrain/fixture/window",
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

    def test_invalid_bounds_stride_and_query_limit(self):
        response = self.client.get(
            "/api/terrain/fixture/window",
            params={"south": NORTH, "north": SOUTH, "west": WEST, "east": EAST},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["error"], "invalid_bounds")

        response = self.client.get(
            "/api/terrain/fixture/window",
            params={"south": SOUTH, "north": NORTH, "west": WEST, "east": EAST, "stride": 0},
        )
        self.assertEqual(response.status_code, 422)

        response = self.client.get(
            "/api/terrain/fixture/window",
            params={"south": SOUTH, "north": NORTH, "west": WEST, "east": EAST},
        )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"]["error"], "terrain_query_too_large")

    def test_non_queryable_combined_dataset_returns_not_queryable(self):
        response = self.main_client.get(
            "/api/terrain/combined/point",
            params={"latitude": NORTH, "longitude": WEST},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["error"], "dataset_not_queryable")
        self.assertNotIn("mars_trek", response.text)

    def test_rgb_and_multichannel_terrain_response(self):
        response = self.client.get(
            "/api/terrain/rgb/point",
            params={"latitude": NORTH, "longitude": WEST},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["value"], {
            "blue_0_6km": 1,
            "green_2_4km": 2,
            "red_9_2km": 3,
        })
        self.assertEqual(response.json()["kind"], "colorized_rgb")

    def test_maximum_response_byte_limit(self):
        small_settings = replace(self.settings, max_response_bytes=100)
        repository = TerrainRepository(small_settings, {"fixture": self.spec})
        app = FastAPI()
        app.include_router(create_terrain_router(repository, small_settings, {"fixture": self.spec}))

        response = TestClient(app).get(
            "/api/terrain/fixture/point",
            params={"latitude": NORTH, "longitude": WEST},
        )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"]["error"], "terrain_response_too_large")
        self.assertNotIn(str(self.directory.name), response.text)

    def test_unknown_dataset_and_safe_errors(self):
        response = self.client.get("/api/terrain/missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["error"], "unknown_dataset")
        self.assertNotIn(str(self.directory.name), response.text)


if __name__ == "__main__":
    unittest.main()
