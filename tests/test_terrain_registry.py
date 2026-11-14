import unittest
from pathlib import Path

from backend.terrain_config import (
    TerrainConfigurationError,
    TerrainSettings,
)
from backend.terrain_registry import (
    DATASET_REGISTRY,
    dataset_ids,
    get_dataset_file_paths,
    get_dataset_spec,
)


class TerrainConfigurationTests(unittest.TestCase):

    def test_default_settings_use_processed_terrain_root(self):
        settings = TerrainSettings.from_environment(environ={})
        self.assertEqual(
            settings.data_root.name,
            "mars_trek",
        )
        self.assertEqual(settings.max_query_points, 500)
        self.assertEqual(settings.max_response_bytes, 1_048_576)

    def test_relative_data_root_is_resolved_against_project_root(self):
        settings = TerrainSettings.from_environment(
            environ={"TERRAIN_DATA_ROOT": "custom/terrain"},
            project_root=Path("/tmp/project"),
        )
        self.assertEqual(settings.data_root, Path("/tmp/project/custom/terrain"))

    def test_relative_project_root_is_resolved_once(self):
        settings = TerrainSettings.from_environment(
            environ={"TERRAIN_DATA_ROOT": "custom/terrain"},
            project_root=Path("relative-project"),
        )
        self.assertEqual(
            settings.data_root,
            (Path("relative-project").resolve() / "custom/terrain").resolve(),
        )

    def test_default_data_root_uses_custom_project_root(self):
        settings = TerrainSettings.from_environment(
            environ={},
            project_root=Path("/tmp/custom-project"),
        )
        self.assertEqual(
            settings.data_root,
            Path("/tmp/custom-project/data/processed/mars_trek"),
        )

    def test_absolute_data_root_is_not_rebased(self):
        settings = TerrainSettings.from_environment(
            environ={"TERRAIN_DATA_ROOT": "/tmp/absolute-terrain"},
            project_root=Path("relative-project"),
        )
        self.assertEqual(settings.data_root, Path("/tmp/absolute-terrain"))

    def test_limits_must_be_positive_integers(self):
        for name in (
            "TERRAIN_MAX_QUERY_POINTS",
            "TERRAIN_MAX_RESPONSE_BYTES",
            "TERRAIN_CACHE_SIZE",
            "TERRAIN_DEFAULT_STRIDE",
        ):
            with self.subTest(name=name):
                with self.assertRaises(TerrainConfigurationError):
                    TerrainSettings.from_environment(environ={name: "0"})

    def test_limits_must_be_numeric(self):
        with self.assertRaises(TerrainConfigurationError):
            TerrainSettings.from_environment(
                environ={"TERRAIN_MAX_QUERY_POINTS": "many"}
            )


class TerrainRegistryTests(unittest.TestCase):

    def test_registry_contains_all_verified_products(self):
        self.assertEqual(
            set(dataset_ids()),
            {
                "elevation",
                "slope",
                "roughness",
                "thermal_inertia",
                "tes_dust",
                "classification",
                "combined",
            },
        )

    def test_registered_files_exist(self):
        paths = get_dataset_file_paths(TerrainSettings.from_environment({}))
        for dataset_id, path in paths.items():
            with self.subTest(dataset_id=dataset_id):
                self.assertTrue(path.is_file(), path)

    def test_products_use_verified_common_grid_metadata(self):
        for dataset_id, spec in DATASET_REGISTRY.items():
            with self.subTest(dataset_id=dataset_id):
                self.assertEqual(spec.dimensions, (296, 257))
                self.assertEqual(spec.coverage, (17.49845382, 19.8030663, 76.50336905, 78.50330394))
                self.assertEqual(spec.latitude_order, "descending")
                self.assertEqual(spec.longitude_order, "ascending")
                self.assertEqual(spec.coordinate_reference_system, "Mars 2000 geographic")

    def test_units_and_product_kinds_are_explicit(self):
        self.assertEqual(get_dataset_spec("elevation").kind, "quantitative")
        self.assertEqual(get_dataset_spec("elevation").units, "m")
        self.assertEqual(get_dataset_spec("slope").kind, "derived_quantitative")
        self.assertEqual(get_dataset_spec("slope").units, "degrees")
        self.assertEqual(get_dataset_spec("classification").kind, "categorical")
        for dataset_id in ("roughness", "thermal_inertia", "tes_dust"):
            with self.subTest(dataset_id=dataset_id):
                self.assertEqual(
                    get_dataset_spec(dataset_id).kind,
                    "colorized_rgb",
                )

    def test_combined_product_is_metadata_only_for_stage_one(self):
        combined = get_dataset_spec("combined")
        self.assertFalse(combined.queryable)
        self.assertIsNone(combined.value_field)
        self.assertEqual(combined.kind, "combined")

    def test_unknown_dataset_raises_key_error(self):
        with self.assertRaises(KeyError):
            get_dataset_spec("not-a-dataset")


if __name__ == "__main__":
    unittest.main()
