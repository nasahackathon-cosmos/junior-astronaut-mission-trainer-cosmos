"""Lazy, validated, read-only access to registered terrain JSON products."""

from __future__ import annotations

import json
import math
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Any, Mapping

from ..terrain_config import DEFAULT_TERRAIN_SETTINGS, TerrainSettings
from ..terrain_registry import DATASET_REGISTRY, DatasetSpec, get_dataset_spec


# JSON products round coordinates to roughly eight decimal places; this is
# intentionally much smaller than one grid cell and only absorbs that rounding.
_COORDINATE_TOLERANCE = 1e-6
_COORDINATE_FALLBACK_DATASETS = frozenset({"slope"})
_RGB_CHANNEL_SCHEMAS = {
    "roughness": frozenset({"blue_0_6km", "green_2_4km", "red_9_2km"}),
    "thermal_inertia": frozenset({"red", "green", "blue", "alpha"}),
    "tes_dust": frozenset({"red", "green", "blue"}),
}


class TerrainRepositoryError(RuntimeError):
    """Base class for safe terrain repository failures."""


class UnknownDatasetError(TerrainRepositoryError):
    """The requested ID is not in the controlled registry."""


class DatasetNotQueryableError(TerrainRepositoryError):
    """The registered product is metadata-only for this stage."""


class TerrainDataNotFoundError(TerrainRepositoryError):
    """A registered terrain file is unavailable."""


class TerrainDataValidationError(TerrainRepositoryError):
    """A terrain file has an invalid structure or grid."""


class CoordinateOutsideCoverageError(TerrainRepositoryError):
    """A coordinate is outside the registered dataset coverage."""


def _freeze(value: Any) -> Any:
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(_freeze(item) for item in value)
    return value


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


@dataclass(frozen=True)
class TerrainDataset:
    """An immutable, validated terrain grid held by the repository cache."""

    spec: DatasetSpec
    rows: int
    columns: int
    latitudes: tuple[float, ...]
    longitudes: tuple[float, ...]
    values: Any

    @property
    def dimensions(self) -> tuple[int, int]:
        return self.rows, self.columns

    def value_at(self, latitude: float, longitude: float) -> Any:
        row, column = _coordinate_indices(self, latitude, longitude)
        if isinstance(self.values, Mapping):
            return MappingProxyType({name: channels[row][column] for name, channels in self.values.items()})
        return self.values[row][column]


def _coordinate_indices(dataset: TerrainDataset, latitude: float, longitude: float) -> tuple[int, int]:
    if not (_is_number(latitude) and _is_number(longitude)):
        raise CoordinateOutsideCoverageError("Latitude and longitude must be finite numbers.")
    south, north, west, east = dataset.spec.coverage
    if not (south <= latitude <= north and west <= longitude <= east):
        raise CoordinateOutsideCoverageError("The requested coordinate is outside dataset coverage.")
    if not (min(dataset.latitudes) - _COORDINATE_TOLERANCE <= latitude <= max(dataset.latitudes) + _COORDINATE_TOLERANCE):
        raise CoordinateOutsideCoverageError("The requested latitude is outside dataset coverage.")
    if not (min(dataset.longitudes) - _COORDINATE_TOLERANCE <= longitude <= max(dataset.longitudes) + _COORDINATE_TOLERANCE):
        raise CoordinateOutsideCoverageError("The requested longitude is outside dataset coverage.")
    row = min(range(dataset.rows), key=lambda i: abs(dataset.latitudes[i] - latitude))
    column = min(range(dataset.columns), key=lambda i: abs(dataset.longitudes[i] - longitude))
    return row, column


class TerrainRepository:
    """Load registered terrain files on demand and retain at most cache_size."""

    def __init__(
        self,
        settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS,
        registry: Mapping[str, DatasetSpec] = DATASET_REGISTRY,
    ) -> None:
        self.settings = settings
        self.registry = registry
        self._cache: OrderedDict[str, TerrainDataset] = OrderedDict()

    @property
    def cached_dataset_ids(self) -> tuple[str, ...]:
        return tuple(self._cache)

    def load(self, dataset_id: str) -> TerrainDataset:
        """Load and validate one dataset, using the bounded LRU cache."""
        spec = self._spec(dataset_id)
        if not spec.queryable:
            raise DatasetNotQueryableError(f"Dataset '{dataset_id}' is not queryable in Stage 2.")
        if dataset_id in self._cache:
            self._cache.move_to_end(dataset_id)
            return self._cache[dataset_id]
        path = spec.file_path(self.settings)
        if not path.is_file():
            raise TerrainDataNotFoundError(f"Terrain dataset '{dataset_id}' is unavailable.")
        try:
            with path.open(encoding="utf-8") as stream:
                raw = json.load(stream)
        except (OSError, UnicodeError) as exc:
            raise TerrainDataNotFoundError(f"Terrain dataset '{dataset_id}' could not be read.") from exc
        except json.JSONDecodeError as exc:
            raise TerrainDataValidationError(f"Terrain dataset '{dataset_id}' contains malformed JSON.") from exc
        dataset = self._validate(spec, raw)
        self._cache[dataset_id] = dataset
        self._cache.move_to_end(dataset_id)
        while len(self._cache) > self.settings.cache_size:
            self._cache.popitem(last=False)
        return dataset

    get_dataset = load
    get = load

    def value_at(self, dataset_id: str, latitude: float, longitude: float) -> Any:
        """Return the nearest stored cell; no interpolation or extrapolation is performed."""
        return self.load(dataset_id).value_at(latitude, longitude)

    lookup = value_at

    def _spec(self, dataset_id: str) -> DatasetSpec:
        try:
            return self.registry[dataset_id]
        except KeyError as exc:
            raise UnknownDatasetError(f"Unknown terrain dataset '{dataset_id}'.") from exc

    def _validate(self, spec: DatasetSpec, raw: Any) -> TerrainDataset:
        if not isinstance(raw, dict):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' must be a JSON object.")
        rows, columns = self._dimensions(spec, raw)
        latitudes, longitudes = self._coordinates(spec, raw, rows, columns)
        if spec.value_field is None or spec.value_field not in raw:
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has no registered value field.")
        values = raw[spec.value_field]
        if spec.kind == "colorized_rgb":
            self._validate_rgb(spec, values, rows, columns)
        else:
            self._validate_grid(spec, values, rows, columns, "value grid")
            if spec.kind == "categorical":
                valid = all(isinstance(cell, str) for row in values for cell in row)
            else:
                valid = all(_is_number(cell) for row in values for cell in row)
            if not valid:
                raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid value types.")
        return TerrainDataset(spec, rows, columns, latitudes, longitudes, _freeze(values))

    def _dimensions(self, spec: DatasetSpec, raw: dict[str, Any]) -> tuple[int, int]:
        dimensions = raw.get("dimensions")
        if isinstance(dimensions, dict):
            rows, columns = dimensions.get("rows"), dimensions.get("columns")
        else:
            rows, columns = raw.get("rows"), raw.get("columns")
        if (rows, columns) != spec.dimensions:
            raise TerrainDataValidationError(
                f"Terrain dataset '{spec.dataset_id}' has invalid grid dimensions; expected {spec.dimensions}."
            )
        return rows, columns

    def _coordinates(self, spec: DatasetSpec, raw: dict[str, Any], rows: int, columns: int) -> tuple[tuple[float, ...], tuple[float, ...]]:
        latitudes = raw.get("latitudes")
        longitudes = raw.get("longitudes")
        if latitudes is None and longitudes is None and spec.dataset_id in _COORDINATE_FALLBACK_DATASETS:
            south, north, west, east = spec.coverage
            latitudes = [north - i * (north - south) / (rows - 1) for i in range(rows)]
            longitudes = [west + i * (east - west) / (columns - 1) for i in range(columns)]
        if not isinstance(latitudes, list) or not isinstance(longitudes, list):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid coordinate arrays.")
        if len(latitudes) != rows or len(longitudes) != columns or not all(_is_number(x) for x in latitudes + longitudes):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid coordinate arrays.")
        self._validate_axis(spec, latitudes, spec.coverage[:2], spec.latitude_order, spec.resolution_degrees[0], "latitude")
        self._validate_axis(spec, longitudes, spec.coverage[2:], spec.longitude_order, spec.resolution_degrees[1], "longitude")
        return tuple(latitudes), tuple(longitudes)

    def _validate_axis(
        self,
        spec: DatasetSpec,
        axis: list[float],
        coverage: tuple[float, float],
        order: str,
        resolution: float,
        name: str,
    ) -> None:
        low, high = coverage
        expected_first, expected_last = (high, low) if order == "descending" else (low, high)
        if not math.isclose(axis[0], expected_first, rel_tol=0.0, abs_tol=_COORDINATE_TOLERANCE) or not math.isclose(
            axis[-1], expected_last, rel_tol=0.0, abs_tol=_COORDINATE_TOLERANCE
        ):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has {name} endpoints outside registered coverage.")
        if resolution <= 0 or len(axis) < 2:
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid {name} resolution.")
        direction = -1 if order == "descending" else 1
        steps = [direction * (b - a) for a, b in zip(axis, axis[1:])]
        if any(step <= 0 for step in steps) or any(
            not math.isclose(step, resolution, rel_tol=0.0, abs_tol=_COORDINATE_TOLERANCE)
            for step in steps
        ):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid {name} ordering or resolution.")

    def _validate_grid(self, spec: DatasetSpec, values: Any, rows: int, columns: int, label: str) -> None:
        if not isinstance(values, list) or len(values) != rows or any(not isinstance(row, list) or len(row) != columns for row in values):
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid {label} dimensions.")

    def _validate_rgb(self, spec: DatasetSpec, values: Any, rows: int, columns: int) -> None:
        if not isinstance(values, dict) or not values:
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid RGB channels.")
        expected_channels = _RGB_CHANNEL_SCHEMAS.get(spec.dataset_id)
        if expected_channels is not None and set(values) != expected_channels:
            raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has an unexpected RGB channel structure.")
        for channel, grid in values.items():
            self._validate_grid(spec, grid, rows, columns, f"RGB channel '{channel}'")
            if any(not isinstance(cell, int) or isinstance(cell, bool) or not 0 <= cell <= 255 for row in grid for cell in row):
                raise TerrainDataValidationError(f"Terrain dataset '{spec.dataset_id}' has invalid RGB channel values.")
