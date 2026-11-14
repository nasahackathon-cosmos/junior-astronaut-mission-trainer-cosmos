"""Registry of verified processed Mars terrain products.

The registry contains metadata and relative file mappings only. It does not
load terrain arrays during application import. Values below were verified
against the current JSON products in ``data/processed/mars_trek``.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .terrain_config import DEFAULT_TERRAIN_SETTINGS, TerrainSettings


DatasetKind = Literal[
    "quantitative",
    "derived_quantitative",
    "categorical",
    "colorized_rgb",
    "combined",
]


@dataclass(frozen=True)
class DatasetSpec:
    """Verified description of one processed terrain product."""

    dataset_id: str
    name: str
    filename: str
    value_field: str | None
    kind: DatasetKind
    units: str | None
    source: str | list[str]
    dimensions: tuple[int, int]
    coverage: tuple[float, float, float, float]
    latitude_order: Literal["ascending", "descending"]
    longitude_order: Literal["ascending", "descending"]
    resolution_degrees: tuple[float, float]
    coordinate_reference_system: str
    processing_script: str | None
    source_raster: str | None
    limitations: tuple[str, ...]
    queryable: bool = True

    @property
    def relative_path(self) -> Path:
        """Return the controlled relative path inside the terrain root."""
        return Path(self.filename)

    def file_path(self, settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS) -> Path:
        """Resolve the registered file without accepting user path input."""
        return (settings.data_root / self.relative_path).resolve()


_COMMON_DIMENSIONS = (296, 257)
_COMMON_COVERAGE = (17.49845382, 19.8030663, 76.50336905, 78.50330394)
_COMMON_RESOLUTION = (0.007812245, 0.007812245)
_COMMON_CRS = "Mars 2000 geographic"
_COMMON_ORDERS = ("descending", "ascending")


DATASET_REGISTRY: dict[str, DatasetSpec] = {
    "elevation": DatasetSpec(
        dataset_id="elevation",
        name="Jezero MOLA Elevation",
        filename="jezero_terrain.json",
        value_field="elevations_m",
        kind="quantitative",
        units="m",
        source="MOLA elevation dataset",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script=None,
        source_raster="jezero_crater_highres.tif",
        limitations=(
            "Regional elevation data, not small-obstacle detection",
        ),
    ),
    "slope": DatasetSpec(
        dataset_id="slope",
        name="Jezero Derived Slope",
        filename="jezero_slope.json",
        value_field="slope_degrees",
        kind="derived_quantitative",
        units="degrees",
        source="MOLA elevation dataset",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_calculate_slope.py",
        source_raster="jezero_crater_highres.tif",
        limitations=(
            "Calculated from elevation using approximate geographic spacing",
            "Not an official rover safety threshold",
        ),
    ),
    "roughness": DatasetSpec(
        dataset_id="roughness",
        name="Jezero MOLA Surface Roughness Map",
        filename="jezero_roughness.json",
        value_field="roughness",
        kind="colorized_rgb",
        units="RGB intensity (0-255)",
        source="MGS MOLA Global Surface Roughness",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_convert_roughness.py",
        source_raster="jezero_roughness.tif",
        limitations=(
            "Colorized RGB intensity, not a calibrated roughness measurement",
            "Does not identify individual obstacles",
        ),
    ),
    "thermal_inertia": DatasetSpec(
        dataset_id="thermal_inertia",
        name="Jezero TES Thermal Inertia Map",
        filename="jezero_thermal_inertia.json",
        value_field="thermal_inertia_map",
        kind="colorized_rgb",
        units="RGB intensity (0-255); not calibrated physical values",
        source="MGS TES Global Thermal Inertia",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_convert_thermal_inertia.py",
        source_raster="jezero_thermal_inertia.tif",
        limitations=(
            "Colorized RGB map, not calibrated thermal inertia values",
        ),
    ),
    "tes_dust": DatasetSpec(
        dataset_id="tes_dust",
        name="Jezero TES Dust Map",
        filename="jezero_tes_dust.json",
        value_field="dust_map",
        kind="colorized_rgb",
        units="RGB intensity (0-255); not calibrated dust concentration",
        source="MGS TES Global Dust",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_convert_tes_dust.py",
        source_raster="jezero_tes_dust.tif",
        limitations=(
            "Colorized RGB map, not calibrated dust concentration",
        ),
    ),
    "classification": DatasetSpec(
        dataset_id="classification",
        name="Jezero Slope-Based Terrain Classification",
        filename="jezero_terrain_classification.json",
        value_field="terrain_classes",
        kind="categorical",
        units=None,
        source="MOLA elevation dataset",
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_classify_terrain.py",
        source_raster="jezero_crater_highres.tif",
        limitations=(
            "Project-defined categories based on slope thresholds",
            "Not an official NASA rover safety classification",
        ),
    ),
    "combined": DatasetSpec(
        dataset_id="combined",
        name="Jezero Combined Terrain and Environmental Dataset",
        filename="jezero_combined_terrain.json",
        value_field=None,
        kind="combined",
        units=None,
        source=[
            "MGS MOLA elevation",
            "MGS MOLA global surface roughness",
            "MGS TES global thermal inertia",
            "MGS TES global dust",
        ],
        dimensions=_COMMON_DIMENSIONS,
        coverage=_COMMON_COVERAGE,
        latitude_order=_COMMON_ORDERS[0],
        longitude_order=_COMMON_ORDERS[1],
        resolution_degrees=_COMMON_RESOLUTION,
        coordinate_reference_system=_COMMON_CRS,
        processing_script="scripts/mars_trek_combine_terrain_data.py",
        source_raster=None,
        limitations=(
            "Contains multiple products with different scientific semantics",
            "RGB layers remain colorized representations",
        ),
        queryable=False,
    ),
}


def dataset_ids() -> tuple[str, ...]:
    """Return registered dataset IDs in stable API order."""
    return tuple(DATASET_REGISTRY)


def get_dataset_spec(dataset_id: str) -> DatasetSpec:
    """Return a registered dataset or raise ``KeyError``."""
    return DATASET_REGISTRY[dataset_id]


def get_dataset_file_paths(
    settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS,
) -> dict[str, Path]:
    """Return controlled paths for all registered products."""
    return {
        dataset_id: spec.file_path(settings)
        for dataset_id, spec in DATASET_REGISTRY.items()
    }
