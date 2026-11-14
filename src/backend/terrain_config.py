"""Configuration for the JSON-based Mars terrain backend."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TERRAIN_DATA_ROOT = PROJECT_ROOT / "data" / "processed" / "mars_trek"


class TerrainConfigurationError(ValueError):
    """Raised when a terrain configuration value is invalid."""


def _positive_integer(name: str, value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise TerrainConfigurationError(
            f"{name} must be a positive integer."
        ) from exc

    if parsed <= 0:
        raise TerrainConfigurationError(
            f"{name} must be a positive integer."
        )
    return parsed


@dataclass(frozen=True)
class TerrainSettings:
    """Runtime settings used by terrain repositories and services."""

    data_root: Path = DEFAULT_TERRAIN_DATA_ROOT
    max_query_points: int = 500
    max_response_bytes: int = 1_048_576
    cache_size: int = 8
    default_stride: int = 1

    def __post_init__(self) -> None:
        """Keep direct construction subject to the same safety limits as env parsing."""
        for name in (
            "max_query_points",
            "max_response_bytes",
            "cache_size",
            "default_stride",
        ):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                raise TerrainConfigurationError(f"{name} must be a positive integer.")

    @classmethod
    def from_environment(
        cls,
        environ: Mapping[str, str] | None = None,
        project_root: Path = PROJECT_ROOT,
    ) -> "TerrainSettings":
        """Build settings from environment variables and safe defaults."""
        values = os.environ if environ is None else environ
        resolved_project_root = Path(project_root).expanduser().resolve()

        raw_root = values.get("TERRAIN_DATA_ROOT")
        data_root = (
            Path(raw_root)
            if raw_root
            else resolved_project_root / "data" / "processed" / "mars_trek"
        )
        if not data_root.is_absolute():
            data_root = resolved_project_root / data_root

        return cls(
            data_root=data_root.resolve(),
            max_query_points=_positive_integer(
                "TERRAIN_MAX_QUERY_POINTS",
                values.get("TERRAIN_MAX_QUERY_POINTS", "500"),
            ),
            max_response_bytes=_positive_integer(
                "TERRAIN_MAX_RESPONSE_BYTES",
                values.get("TERRAIN_MAX_RESPONSE_BYTES", "1048576"),
            ),
            cache_size=_positive_integer(
                "TERRAIN_CACHE_SIZE",
                values.get("TERRAIN_CACHE_SIZE", "8"),
            ),
            default_stride=_positive_integer(
                "TERRAIN_DEFAULT_STRIDE",
                values.get("TERRAIN_DEFAULT_STRIDE", "1"),
            ),
        )


DEFAULT_TERRAIN_SETTINGS = TerrainSettings.from_environment()
