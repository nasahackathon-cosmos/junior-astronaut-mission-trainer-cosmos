import json
import math
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from backend.terrain_config import TerrainConfigurationError, TerrainSettings
from backend.terrain_registry import DATASET_REGISTRY
from backend.terrain.repository import (
    CoordinateOutsideCoverageError,
    TerrainDataNotFoundError,
    TerrainDataValidationError,
    TerrainRepository,
    UnknownDatasetError,
)


ROWS, COLUMNS = 296, 257
LATITUDES = [19.8030663 - i * (19.8030663 - 17.49845382) / (ROWS - 1) for i in range(ROWS)]
LONGITUDES = [76.50336905 + i * (78.50330394 - 76.50336905) / (COLUMNS - 1) for i in range(COLUMNS)]


class TerrainRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.spec = replace(DATASET_REGISTRY["elevation"], filename="fixture.json")
        self.registry = {"fixture": self.spec}
        self.settings = TerrainSettings(data_root=self.root, cache_size=2)

    def tearDown(self):
        self.directory.cleanup()

    def write(self, payload):
        (self.root / "fixture.json").write_text(json.dumps(payload), encoding="utf-8")

    def scalar_payload(self, **overrides):
        payload = {
            "rows": ROWS,
            "columns": COLUMNS,
            "latitudes": LATITUDES,
            "longitudes": LONGITUDES,
            "elevations_m": [[100] * COLUMNS for _ in range(ROWS)],
        }
        payload.update(overrides)
        return payload

    def test_successful_loading_dimensions_and_lookup(self):
        values = [[row * COLUMNS + column for column in range(COLUMNS)] for row in range(ROWS)]
        self.write(self.scalar_payload(elevations_m=values))
        repository = TerrainRepository(self.settings, self.registry)

        dataset = repository.load("fixture")

        self.assertEqual(dataset.dimensions, (ROWS, COLUMNS))
        self.assertEqual(repository.value_at("fixture", LATITUDES[0], LONGITUDES[0]), 0)
        self.assertEqual(repository.value_at("fixture", LATITUDES[-1], LONGITUDES[-1]), (ROWS - 1) * COLUMNS + COLUMNS - 1)
        self.assertEqual(repository.cached_dataset_ids, ("fixture",))

    def test_all_coverage_boundaries_map_to_their_edge_cells(self):
        values = [[row * COLUMNS + column for column in range(COLUMNS)] for row in range(ROWS)]
        self.write(self.scalar_payload(elevations_m=values))
        repository = TerrainRepository(self.settings, self.registry)
        south, north, west, east = self.spec.coverage
        self.assertEqual(repository.value_at("fixture", north, west), 0)
        self.assertEqual(repository.value_at("fixture", north, east), COLUMNS - 1)
        self.assertEqual(repository.value_at("fixture", south, west), (ROWS - 1) * COLUMNS)
        self.assertEqual(repository.value_at("fixture", south, east), ROWS * COLUMNS - 1)

    def test_coordinates_outside_coverage_are_rejected(self):
        self.write(self.scalar_payload())
        repository = TerrainRepository(self.settings, self.registry)
        with self.assertRaises(CoordinateOutsideCoverageError):
            repository.value_at("fixture", 16.0, LONGITUDES[0])

    def test_missing_file_and_malformed_json(self):
        repository = TerrainRepository(self.settings, self.registry)
        with self.assertRaises(TerrainDataNotFoundError):
            repository.load("fixture")
        (self.root / "fixture.json").write_text("{not json", encoding="utf-8")
        with self.assertRaises(TerrainDataValidationError):
            repository.load("fixture")

    def test_incorrect_dimensions_and_coordinate_arrays(self):
        self.write(self.scalar_payload(rows=ROWS - 1))
        with self.assertRaises(TerrainDataValidationError):
            TerrainRepository(self.settings, self.registry).load("fixture")
        self.write(self.scalar_payload(latitudes=LATITUDES[:-1]))
        with self.assertRaises(TerrainDataValidationError):
            TerrainRepository(self.settings, self.registry).load("fixture")
        self.write(self.scalar_payload(latitudes=None, longitudes=None))
        with self.assertRaises(TerrainDataValidationError):
            TerrainRepository(self.settings, self.registry).load("fixture")
        self.write(self.scalar_payload(latitudes=[value + 0.01 for value in LATITUDES]))
        with self.assertRaises(TerrainDataValidationError):
            TerrainRepository(self.settings, self.registry).load("fixture")

    def test_non_finite_coordinates_and_values_are_rejected(self):
        for field, value in (("latitudes", math.nan), ("longitudes", math.inf)):
            with self.subTest(field=field):
                coordinates = list(LATITUDES if field == "latitudes" else LONGITUDES)
                coordinates[10] = value
                self.write(self.scalar_payload(**{field: coordinates}))
                with self.assertRaises(TerrainDataValidationError):
                    TerrainRepository(self.settings, self.registry).load("fixture")
        values = [[100] * COLUMNS for _ in range(ROWS)]
        values[10][10] = math.nan
        self.write(self.scalar_payload(elevations_m=values))
        with self.assertRaises(TerrainDataValidationError):
            TerrainRepository(self.settings, self.registry).load("fixture")
        self.write(self.scalar_payload())
        repository = TerrainRepository(self.settings, self.registry)
        with self.assertRaises(CoordinateOutsideCoverageError):
            repository.value_at("fixture", math.nan, LONGITUDES[0])
        with self.assertRaises(CoordinateOutsideCoverageError):
            repository.value_at("fixture", LATITUDES[0], math.inf)

    def test_rgb_channels_are_validated(self):
        rgb_spec = replace(
            self.spec,
            dataset_id="roughness",
            filename="rgb.json",
            value_field="roughness",
            kind="colorized_rgb",
        )
        rgb_registry = {"rgb": rgb_spec}
        payload = self.scalar_payload()
        payload.pop("elevations_m")
        payload["roughness"] = {
            channel: [[12] * COLUMNS for _ in range(ROWS)]
            for channel in ("blue_0_6km", "green_2_4km", "red_9_2km")
        }
        (self.root / "rgb.json").write_text(json.dumps(payload), encoding="utf-8")
        repository = TerrainRepository(self.settings, rgb_registry)
        self.assertEqual(repository.value_at("rgb", LATITUDES[0], LONGITUDES[0]), {channel: 12 for channel in payload["roughness"]})
        payload["roughness"]["red_9_2km"][0][0] = 256
        (self.root / "rgb.json").write_text(json.dumps(payload), encoding="utf-8")
        repository = TerrainRepository(self.settings, rgb_registry)
        with self.assertRaises(TerrainDataValidationError):
            repository.load("rgb")

    def test_rgb_schemas_match_each_registered_product(self):
        schemas = {
            "roughness": {"blue_0_6km", "green_2_4km", "red_9_2km"},
            "thermal_inertia": {"red", "green", "blue", "alpha"},
            "tes_dust": {"red", "green", "blue"},
        }
        for dataset_id, channels in schemas.items():
            with self.subTest(dataset_id=dataset_id):
                spec = replace(self.spec, dataset_id=dataset_id, filename=f"{dataset_id}.json", value_field={
                    "roughness": "roughness",
                    "thermal_inertia": "thermal_inertia_map",
                    "tes_dust": "dust_map",
                }[dataset_id], kind="colorized_rgb")
                payload = self.scalar_payload()
                payload.pop("elevations_m")
                payload[spec.value_field] = {channel: [[12] * COLUMNS for _ in range(ROWS)] for channel in channels}
                (self.root / spec.filename).write_text(json.dumps(payload), encoding="utf-8")
                self.assertIsNotNone(TerrainRepository(self.settings, {dataset_id: spec}).load(dataset_id))
                payload[spec.value_field].pop(next(iter(channels)))
                (self.root / spec.filename).write_text(json.dumps(payload), encoding="utf-8")
                with self.assertRaises(TerrainDataValidationError):
                    TerrainRepository(self.settings, {dataset_id: spec}).load(dataset_id)

    def test_cached_data_cannot_be_mutated(self):
        self.write(self.scalar_payload())
        dataset = TerrainRepository(self.settings, self.registry).load("fixture")
        with self.assertRaises(TypeError):
            dataset.values[0][0] = 5

    def test_direct_settings_construction_validates_cache_size(self):
        with self.assertRaises(TerrainConfigurationError):
            TerrainSettings(data_root=self.root, cache_size=0)
        with self.assertRaises(TerrainConfigurationError):
            TerrainSettings(data_root=self.root, cache_size=-1)

    def test_cache_is_bounded_and_is_lazy(self):
        self.write(self.scalar_payload())
        second = replace(self.spec, dataset_id="second", filename="second.json")
        registry = {"fixture": self.spec, "second": second}
        (self.root / "second.json").write_text(json.dumps(self.scalar_payload()), encoding="utf-8")
        repository = TerrainRepository(self.settings, registry)
        self.assertEqual(repository.cached_dataset_ids, ())
        repository.load("fixture")
        repository.load("second")
        repository.load("fixture")
        self.assertEqual(repository.cached_dataset_ids, ("second", "fixture"))
        third = replace(self.spec, dataset_id="third", filename="third.json")
        (self.root / "third.json").write_text(json.dumps(self.scalar_payload()), encoding="utf-8")
        repository.registry = {**registry, "third": third}
        repository.load("third")
        self.assertEqual(repository.cached_dataset_ids, ("fixture", "third"))

    def test_only_requested_dataset_is_loaded(self):
        self.write(self.scalar_payload())
        other = replace(self.spec, dataset_id="missing", filename="missing.json")
        repository = TerrainRepository(self.settings, {"fixture": self.spec, "missing": other})
        repository.load("fixture")
        self.assertEqual(repository.cached_dataset_ids, ("fixture",))

    def test_unknown_dataset_is_safe(self):
        with self.assertRaises(UnknownDatasetError):
            TerrainRepository(self.settings, self.registry).load("unknown")


if __name__ == "__main__":
    unittest.main()
