"""Configuration for the CCMC DONKI API integration."""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Load local development settings without overriding variables already supplied
# by the deployment environment.
load_dotenv(PROJECT_ROOT / ".env", override=False)

DEFAULT_DONKI_API_BASE_URL = "https://ccmc.gsfc.nasa.gov/DONKI-API"


@dataclass(frozen=True)
class DonkiSettings:
    api_base_url: str = DEFAULT_DONKI_API_BASE_URL
    timeout_seconds: float = 20.0
    max_date_range_days: int = 30
    max_results: int = 100
    max_response_bytes: int = 1_048_576

    @classmethod
    def from_environment(cls) -> "DonkiSettings":
        base_url = os.getenv(
            "DONKI_API_BASE_URL", DEFAULT_DONKI_API_BASE_URL
        ).strip().rstrip("/")

        try:
            timeout = float(os.getenv("DONKI_TIMEOUT_SECONDS", "20"))
            max_days = int(os.getenv("DONKI_MAX_DATE_RANGE_DAYS", "30"))
            max_results = int(os.getenv("DONKI_MAX_RESULTS", "100"))
            max_response_bytes = int(os.getenv("DONKI_MAX_RESPONSE_BYTES", "1048576"))
        except ValueError as exc:
            raise ValueError("Invalid DONKI configuration value.") from exc

        if not base_url.startswith("https://"):
            raise ValueError("DONKI_API_BASE_URL must use HTTPS.")
        if (not math.isfinite(timeout) or timeout <= 0 or max_days <= 0 or not 1 <= max_results <= 100 or not 1024 <= max_response_bytes <= 10_485_760):
            raise ValueError("DONKI limits and timeout must be positive.")

        return cls(
            api_base_url=base_url,
            timeout_seconds=timeout,
            max_date_range_days=max_days,
            max_results=max_results,
            max_response_bytes=max_response_bytes,
        )


DEFAULT_DONKI_SETTINGS = DonkiSettings.from_environment()
