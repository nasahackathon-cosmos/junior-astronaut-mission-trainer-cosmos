"""Mission-linked regional terrain context and bounded analysis routes."""

from __future__ import annotations

import json
import math
from collections import Counter
from statistics import fmean
from typing import Any, Mapping

from fastapi import APIRouter, HTTPException, Query

from ..mission_data import get_mission_terrain_context
from ..terrain_config import DEFAULT_TERRAIN_SETTINGS, TerrainSettings
from ..terrain_registry import DATASET_REGISTRY, DatasetSpec
from .repository import (
    DatasetNotQueryableError,
    TerrainDataNotFoundError,
    TerrainDataValidationError,
    TerrainRepository,
    UnknownDatasetError,
)


def _error(status_code: int, code: str, detail: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": code, "detail": detail},
    )


def _finite(value: float, name: str) -> float:
    if not math.isfinite(value):
        raise _error(422, "invalid_coordinate", f"{name} must be a finite number.")
    return value


def _load(repository: TerrainRepository, dataset_id: str):
    try:
        return repository.load(dataset_id)
    except UnknownDatasetError as exc:
        raise _error(503, "terrain_dataset_unavailable", "A mapped terrain dataset is not registered.") from exc
    except DatasetNotQueryableError as exc:
        raise _error(503, "terrain_dataset_unavailable", "A mapped terrain dataset is not queryable.") from exc
    except TerrainDataNotFoundError as exc:
        raise _error(503, "terrain_data_unavailable", "A mapped terrain dataset is unavailable.") from exc
    except TerrainDataValidationError as exc:
        raise _error(503, "terrain_data_invalid", "A mapped terrain dataset is invalid.") from exc


def _dataset_ids(
    filenames: list[str],
    registry: Mapping[str, DatasetSpec],
) -> list[str]:
    by_filename = {spec.filename: dataset_id for dataset_id, spec in registry.items()}
    try:
        return [by_filename[filename] for filename in filenames]
    except KeyError as exc:
        raise _error(503, "terrain_dataset_unavailable", "A mapped terrain dataset is not registered.") from exc


def _selected_grid(dataset, south: float, north: float, west: float, east: float, stride: int):
    coverage_south, coverage_north, coverage_west, coverage_east = dataset.spec.coverage
    if not (
        coverage_south <= south <= coverage_north
        and coverage_south <= north <= coverage_north
        and coverage_west <= west <= coverage_east
        and coverage_west <= east <= coverage_east
    ):
        raise _error(422, "bounds_out_of_coverage", "The requested bounds are outside dataset coverage.")

    rows = [row for row, value in enumerate(dataset.latitudes) if south <= value <= north][::stride]
    columns = [column for column, value in enumerate(dataset.longitudes) if west <= value <= east][::stride]
    if not rows or not columns:
        raise _error(
            422,
            "empty_grid_selection",
            "The requested bounds do not contain any terrain grid cells.",
        )
    return rows, columns


def _summary(values: Any) -> dict[str, Any]:
    if isinstance(values, Mapping):
        return {
            "summary_type": "multi_channel",
            "channels": {
                str(channel): _summary(channel_values)
                for channel, channel_values in values.items()
            },
        }
    flattened = [value for row in values for value in row]
    if flattened and isinstance(flattened[0], str):
        return {
            "summary_type": "categorical",
            "sample_count": len(flattened),
            "category_counts": dict(sorted(Counter(flattened).items())),
        }

    return {
        "summary_type": "numeric",
        "sample_count": len(flattened),
        "minimum": min(flattened),
        "maximum": max(flattened),
        "mean": fmean(flattened),
    }


def _check_response_size(payload: dict[str, Any], settings: TerrainSettings) -> dict[str, Any]:
    encoded = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    if len(encoded) > settings.max_response_bytes:
        raise _error(413, "terrain_response_too_large", "The terrain analysis response is too large.")
    return payload


def create_mission_terrain_router(
    repository: TerrainRepository | None = None,
    settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS,
    registry: Mapping[str, DatasetSpec] = DATASET_REGISTRY,
) -> APIRouter:
    """Create routes that connect validated mission mappings to terrain products."""
    terrain_repository = repository or TerrainRepository(settings=settings, registry=registry)
    router = APIRouter(prefix="/api/missions", tags=["Mission Terrain"])

    @router.get("/{mission_id}/terrain-context")
    def terrain_context(mission_id: str) -> dict[str, Any]:
        context = get_mission_terrain_context(mission_id)
        if context is None:
            raise HTTPException(status_code=404, detail=f"Mission {mission_id} was not found.")
        return context

    @router.get("/{mission_id}/terrain-analysis")
    def terrain_analysis(
        mission_id: str,
        south: float | None = None,
        north: float | None = None,
        west: float | None = None,
        east: float | None = None,
        stride: int | None = Query(default=None, ge=1),
    ) -> dict[str, Any]:
        context = get_mission_terrain_context(mission_id)
        if context is None:
            raise HTTPException(status_code=404, detail=f"Mission {mission_id} was not found.")
        if context["terrain_status"] == "not_mapped":
            return context
        if None in (south, north, west, east):
            raise _error(422, "missing_bounds", "Bounded terrain analysis requires south, north, west, and east.")

        south, north, west, east = (
            _finite(south, "south"),
            _finite(north, "north"),
            _finite(west, "west"),
            _finite(east, "east"),
        )
        if south > north or west > east:
            raise _error(422, "invalid_bounds", "Terrain bounds must be ordered from south to north and west to east.")

        selected_stride = stride or settings.default_stride
        dataset_ids = _dataset_ids(context["mission_context"]["datasets"], registry)
        datasets = []
        selected_count = None
        loaded = {}
        for dataset_id in dataset_ids:
            if dataset_id not in loaded:
                loaded[dataset_id] = _load(terrain_repository, dataset_id)
            dataset = loaded[dataset_id]
            rows, columns = _selected_grid(dataset, south, north, west, east, selected_stride)
            count = len(rows) * len(columns)
            selected_count = count if selected_count is None else max(selected_count, count)
            if count > settings.max_query_points:
                raise _error(413, "terrain_query_too_large", "The requested terrain analysis contains too many grid points.")
            if isinstance(dataset.values, Mapping):
                values = {
                    channel: [[grid[row][column] for column in columns] for row in rows]
                    for channel, grid in dataset.values.items()
                }
            else:
                values = [[dataset.values[row][column] for column in columns] for row in rows]
            datasets.append({
                "dataset_id": dataset.spec.dataset_id,
                "name": dataset.spec.name,
                "kind": dataset.spec.kind,
                "units": dataset.spec.units,
                "limitations": list(dataset.spec.limitations),
                "summary": _summary(values),
            })

        payload = {
            "mission_id": mission_id,
            "terrain_status": "mapped",
            "association_type": "regional_context",
            "exact_coordinates": None,
            "coordinate_note": context["coordinate_note"],
            "region": context["region"],
            "bounds": {"south": south, "north": north, "west": west, "east": east},
            "stride": selected_stride,
            "sample_count": selected_count,
            "datasets": datasets,
            "limitations": context["limitations"],
        }
        return _check_response_size(payload, settings)

    return router


mission_terrain_router = create_mission_terrain_router()

__all__ = ["create_mission_terrain_router", "mission_terrain_router"]
