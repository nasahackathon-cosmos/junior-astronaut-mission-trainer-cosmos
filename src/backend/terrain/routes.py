"""FastAPI routes for read-only Mars terrain access."""

from __future__ import annotations

import json
import math
from typing import Any, Mapping

from fastapi import APIRouter, HTTPException, Query

from ..terrain_config import DEFAULT_TERRAIN_SETTINGS, TerrainSettings
from ..terrain_registry import DATASET_REGISTRY, DatasetSpec
from .repository import (
    CoordinateOutsideCoverageError,
    DatasetNotQueryableError,
    TerrainDataNotFoundError,
    TerrainDataValidationError,
    TerrainRepository,
    TerrainRepositoryError,
    UnknownDatasetError,
)


def _json_safe(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _metadata(spec: DatasetSpec) -> dict[str, Any]:
    return {
        "dataset_id": spec.dataset_id,
        "name": spec.name,
        "kind": spec.kind,
        "units": spec.units,
        "source": spec.source,
        "dimensions": {
            "rows": spec.dimensions[0],
            "columns": spec.dimensions[1],
        },
        "coverage": {
            "south": spec.coverage[0],
            "north": spec.coverage[1],
            "west": spec.coverage[2],
            "east": spec.coverage[3],
        },
        "latitude_order": spec.latitude_order,
        "longitude_order": spec.longitude_order,
        "resolution_degrees": {
            "latitude": spec.resolution_degrees[0],
            "longitude": spec.resolution_degrees[1],
        },
        "coordinate_reference_system": spec.coordinate_reference_system,
        "processing_script": spec.processing_script,
        "limitations": list(spec.limitations),
        "queryable": spec.queryable,
    }


def _error(status_code: int, code: str, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": code, "detail": detail})


def _parse_finite(value: float, name: str) -> float:
    if not math.isfinite(value):
        raise _error(422, "invalid_coordinate", f"{name} must be a finite number.")
    return value


def _load(repository: TerrainRepository, dataset_id: str):
    try:
        return repository.load(dataset_id)
    except UnknownDatasetError as exc:
        raise _error(404, "unknown_dataset", "The requested terrain dataset was not found.") from exc
    except DatasetNotQueryableError as exc:
        raise _error(404, "dataset_not_queryable", "The requested terrain dataset is not queryable.") from exc
    except TerrainDataNotFoundError as exc:
        raise _error(503, "terrain_data_unavailable", "The requested terrain data is unavailable.") from exc
    except TerrainDataValidationError as exc:
        raise _error(503, "terrain_data_invalid", "The requested terrain data is invalid.") from exc


def _check_response_size(payload: Any, settings: TerrainSettings) -> Any:
    encoded = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    if len(encoded) > settings.max_response_bytes:
        raise _error(413, "terrain_response_too_large", "The requested terrain response is too large.")
    return payload


def create_terrain_router(
    repository: TerrainRepository | None = None,
    settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS,
    registry: Mapping[str, DatasetSpec] = DATASET_REGISTRY,
) -> APIRouter:
    """Create a terrain router with lazy repository access."""
    terrain_repository = repository or TerrainRepository(settings=settings, registry=registry)
    router = APIRouter(prefix="/api/terrain", tags=["Terrain"])

    @router.get("")
    def terrain_catalogue() -> dict[str, Any]:
        datasets = [_metadata(spec) for spec in registry.values()]
        return {"count": len(datasets), "datasets": datasets}

    @router.get("/{dataset_id}/point")
    def terrain_point(
        dataset_id: str,
        latitude: float,
        longitude: float,
    ) -> dict[str, Any]:
        latitude = _parse_finite(latitude, "latitude")
        longitude = _parse_finite(longitude, "longitude")
        dataset = _load(terrain_repository, dataset_id)
        try:
            value = dataset.value_at(latitude, longitude)
        except CoordinateOutsideCoverageError as exc:
            raise _error(422, "coordinate_out_of_coverage", "The requested coordinate is outside dataset coverage.") from exc
        payload = {
            "dataset_id": dataset.spec.dataset_id,
            "latitude": latitude,
            "longitude": longitude,
            "value": _json_safe(value),
            "units": dataset.spec.units,
            "kind": dataset.spec.kind,
        }
        return _check_response_size(payload, settings)

    @router.get("/{dataset_id}/window")
    def terrain_window(
        dataset_id: str,
        south: float,
        north: float,
        west: float,
        east: float,
        stride: int | None = Query(default=None, ge=1),
    ) -> dict[str, Any]:
        south, north, west, east = (
            _parse_finite(south, "south"),
            _parse_finite(north, "north"),
            _parse_finite(west, "west"),
            _parse_finite(east, "east"),
        )
        if south > north or west > east:
            raise _error(422, "invalid_bounds", "Terrain bounds must be ordered from south to north and west to east.")
        dataset = _load(terrain_repository, dataset_id)
        coverage_south, coverage_north, coverage_west, coverage_east = dataset.spec.coverage
        if not (
            coverage_south <= south <= coverage_north
            and coverage_south <= north <= coverage_north
            and coverage_west <= west <= coverage_east
            and coverage_west <= east <= coverage_east
        ):
            raise _error(422, "bounds_out_of_coverage", "The requested bounds are outside dataset coverage.")
        selected_rows = [
            row for row, value in enumerate(dataset.latitudes)
            if south <= value <= north
        ][:: stride or settings.default_stride]
        selected_columns = [
            column for column, value in enumerate(dataset.longitudes)
            if west <= value <= east
        ][:: stride or settings.default_stride]
        if not selected_rows or not selected_columns:
            raise _error(
                422,
                "empty_grid_selection",
                "The requested bounds do not contain any terrain grid cells.",
            )
        point_count = len(selected_rows) * len(selected_columns)
        if point_count > settings.max_query_points:
            raise _error(413, "terrain_query_too_large", "The requested terrain window contains too many grid points.")
        if isinstance(dataset.values, Mapping):
            values = {
                channel: [
                    [dataset.values[channel][row][column] for column in selected_columns]
                    for row in selected_rows
                ]
                for channel in dataset.values
            }
        else:
            values = [
                [dataset.values[row][column] for column in selected_columns]
                for row in selected_rows
            ]
        payload = {
            "dataset_id": dataset.spec.dataset_id,
            "bounds": {"south": south, "north": north, "west": west, "east": east},
            "stride": stride or settings.default_stride,
            "dimensions": {"rows": len(selected_rows), "columns": len(selected_columns)},
            "latitudes": [dataset.latitudes[row] for row in selected_rows],
            "longitudes": [dataset.longitudes[column] for column in selected_columns],
            "values": _json_safe(values),
            "units": dataset.spec.units,
            "kind": dataset.spec.kind,
        }
        return _check_response_size(payload, settings)

    @router.get("/{dataset_id}")
    def terrain_metadata(dataset_id: str) -> dict[str, Any]:
        try:
            spec = registry[dataset_id]
        except KeyError as exc:
            raise _error(404, "unknown_dataset", "The requested terrain dataset was not found.") from exc
        return _metadata(spec)

    return router


terrain_router = create_terrain_router()

__all__ = ["create_terrain_router", "terrain_router"]
