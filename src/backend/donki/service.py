"""DONKI HTTP client and compact event normalization."""

from __future__ import annotations

from datetime import date
import json
from typing import Any

import httpx

from .config import DEFAULT_DONKI_SETTINGS, DonkiSettings


SUPPORTED_EVENT_TYPES = {"FLR", "CME", "GST", "SEP"}


class DonkiUpstreamError(RuntimeError):
    """Safe error raised when the upstream DONKI service is unavailable."""

    def __init__(self, public_message: str, status_code: int = 502):
        super().__init__(public_message)
        self.public_message = public_message
        self.status_code = status_code


def _first_present(record: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value is not None:
            return value
    return None


def _validate_event(event_type: str, item: dict[str, Any]) -> None:
    """Reject malformed structures that could otherwise cause server errors."""
    for key in ("instruments", "linkedEvents"):
        value = item.get(key, [])
        if value is not None and not isinstance(value, list):
            raise DonkiUpstreamError(
                "The DONKI service returned malformed event records."
            )

    if event_type == "CME":
        analyses = item.get("cmeAnalyses")
        if analyses is None:
            analyses = []
        if not isinstance(analyses, list) or not all(
            isinstance(entry, dict) for entry in analyses
        ):
            raise DonkiUpstreamError(
                "The DONKI service returned malformed CME analysis records."
            )


def _normalize_event(event_type: str, item: dict[str, Any]) -> dict[str, Any]:
    """Return a stable, frontend-friendly event shape without raw payloads."""
    event_type = event_type.upper()
    _validate_event(event_type, item)

    if event_type == "FLR":
        return {
            "event_type": event_type,
            "event_id": _first_present(item, "flrID"),
            "start_time": _first_present(item, "beginTime"),
            "peak_time": _first_present(item, "peakTime"),
            "end_time": _first_present(item, "endTime"),
            "classification": _first_present(item, "classType"),
            "source_location": _first_present(item, "sourceLocation"),
            "active_region_number": _first_present(item, "activeRegionNum"),
            "instruments": item.get("instruments") or [],
            "linked_events": item.get("linkedEvents") or [],
            "link": item.get("link"),
            "note": item.get("note"),
        }

    if event_type == "CME":
        analyses = item.get("cmeAnalyses")
        if analyses is None:
            analyses = []
        analysis = next(
            (entry for entry in analyses if entry.get("isMostAccurate") is True),
            analyses[0] if analyses else {},
        )
        return {
            "event_type": event_type,
            "event_id": _first_present(item, "activityID"),
            "start_time": _first_present(item, "startTime"),
            "peak_time": None,
            "end_time": None,
            "classification": _first_present(analysis, "type", "associatedCMEID"),
            "source_location": (
                _first_present(analysis, "sourceLocation")
                or item.get("sourceLocation")
            ),
            "active_region_number": _first_present(item, "activeRegionNum"),
            "instruments": item.get("instruments") or [],
            "linked_events": item.get("linkedEvents") or [],
            "link": item.get("link"),
            "note": item.get("note"),
            "analysis": {
                "time": analysis.get("time"),
                "latitude": analysis.get("latitude"),
                "longitude": analysis.get("longitude"),
                "speed_km_s": analysis.get("speed"),
                "half_angle_degrees": analysis.get("halfAngle"),
                "is_most_accurate": analysis.get("isMostAccurate"),
            } if analysis else None,
        }

    if event_type == "GST":
        return {
            "event_type": event_type,
            "event_id": _first_present(item, "gstID"),
            "start_time": _first_present(item, "startTime"),
            "peak_time": None,
            "end_time": None,
            "classification": None,
            "source_location": None,
            "active_region_number": None,
            "instruments": item.get("instruments") or [],
            "linked_events": item.get("linkedEvents") or [],
            "link": item.get("link"),
            "note": item.get("note"),
        }

    return {
        "event_type": event_type,
        "event_id": _first_present(item, "sepID"),
        "start_time": _first_present(item, "eventTime", "startTime"),
        "peak_time": item.get("peakTime"),
        "end_time": item.get("endTime"),
        "classification": _first_present(item, "sepType", "classType"),
        "source_location": item.get("sourceLocation"),
        "active_region_number": item.get("activeRegionNum"),
        "instruments": item.get("instruments") or [],
        "linked_events": item.get("linkedEvents") or [],
        "link": item.get("link"),
        "note": item.get("note"),
    }


def fetch_donki_events(
    event_type: str,
    start_date: date,
    end_date: date,
    limit: int = 100,
    settings: DonkiSettings = DEFAULT_DONKI_SETTINGS,
) -> dict[str, Any]:
    """Fetch and normalize one DONKI event category with bounded memory use."""
    normalized_type = event_type.upper()

    if normalized_type not in SUPPORTED_EVENT_TYPES:
        raise ValueError("Unsupported DONKI event type.")
    if start_date > end_date:
        raise ValueError("start_date must not be after end_date.")
    if (end_date - start_date).days + 1 > settings.max_date_range_days:
        raise ValueError(
            f"Date range cannot exceed {settings.max_date_range_days} days."
        )
    if end_date > date.today():
        raise ValueError("end_date cannot be in the future.")
    if limit < 1 or limit > settings.max_results:
        raise ValueError(
            f"limit must be between 1 and {settings.max_results}."
        )

    url = f"{settings.api_base_url}/get/{normalized_type}"
    params = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
    }

    try:
        with httpx.stream(
            "GET",
            url,
            params=params,
            timeout=settings.timeout_seconds,
            headers={"Accept": "application/json"},
        ) as response:
            response.raise_for_status()

            content_length = response.headers.get("Content-Length")
            if content_length:
                try:
                    if int(content_length) > settings.max_response_bytes:
                        raise DonkiUpstreamError(
                            "The DONKI response exceeded the configured size limit.",
                            status_code=502,
                        )
                except ValueError:
                    raise DonkiUpstreamError(
                        "The DONKI service returned an invalid response size."
                    )

            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > settings.max_response_bytes:
                    raise DonkiUpstreamError(
                        "The DONKI response exceeded the configured size limit.",
                        status_code=502,
                    )

        payload = json.loads(body)

    except DonkiUpstreamError:
        raise
    except httpx.TimeoutException as exc:
        raise DonkiUpstreamError(
            "DONKI did not respond before the request timed out.",
            status_code=504,
        ) from exc
    except httpx.HTTPStatusError as exc:
        status = 503 if exc.response.status_code == 429 else 502
        raise DonkiUpstreamError(
            "The DONKI service returned an unsuccessful response.",
            status_code=status,
        ) from exc
    except httpx.RequestError as exc:
        raise DonkiUpstreamError(
            "The DONKI service could not be reached.",
            status_code=503,
        ) from exc
    except (ValueError, UnicodeDecodeError) as exc:
        raise DonkiUpstreamError(
            "The DONKI service returned an invalid response.",
            status_code=502,
        ) from exc

    if not isinstance(payload, list):
        raise DonkiUpstreamError(
            "The DONKI service returned an unexpected response format."
        )
    if not all(isinstance(item, dict) for item in payload):
        raise DonkiUpstreamError(
            "The DONKI service returned malformed event records."
        )

    normalized = [
        _normalize_event(normalized_type, item)
        for item in payload[:limit]
    ]

    return {
        "source": "NASA CCMC DONKI",
        "event_type": normalized_type,
        "date_range": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "count": len(normalized),
        "available_count": len(payload),
        "limit": limit,
        "events": normalized,
        "data_notice": (
            "DONKI provides near-real-time space-weather event information "
            "for research and prototyping. It is not an operational forecast "
            "or a spacecraft safety determination."
        ),
    }
