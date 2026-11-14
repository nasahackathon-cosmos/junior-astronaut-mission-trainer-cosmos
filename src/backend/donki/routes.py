"""FastAPI routes for NASA CCMC DONKI events."""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from .config import DEFAULT_DONKI_SETTINGS
from .service import DonkiUpstreamError, fetch_donki_events


donki_router = APIRouter(prefix="/api/donki", tags=["Space Weather"])


@donki_router.get("/events")
def donki_events(
    event_type: Literal["FLR", "CME", "GST", "SEP"] = Query(
        default="FLR",
        description="DONKI event category.",
    ),
    start_date: date | None = Query(
        default=None,
        description="Inclusive start date in YYYY-MM-DD format.",
    ),
    end_date: date | None = Query(
        default=None,
        description="Inclusive end date in YYYY-MM-DD format.",
    ),
    limit: int = Query(default=DEFAULT_DONKI_SETTINGS.max_results, ge=1, le=DEFAULT_DONKI_SETTINGS.max_results),
):
    """Fetch a bounded date range of solar and geomagnetic events."""
    today = date.today()

    if start_date is None and end_date is None:
        resolved_end = today
        resolved_start = today - timedelta(days=6)
    elif start_date is None:
        resolved_end = end_date
        resolved_start = resolved_end - timedelta(days=6)
    elif end_date is None:
        resolved_start = start_date
        resolved_end = today
    else:
        resolved_start = start_date
        resolved_end = end_date

    if resolved_start > resolved_end:
        raise HTTPException(
            status_code=422,
            detail="start_date must not be after end_date.",
        )

    if (resolved_end - resolved_start).days + 1 > (
        DEFAULT_DONKI_SETTINGS.max_date_range_days
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Requested date range exceeds the configured "
                f"{DEFAULT_DONKI_SETTINGS.max_date_range_days}-day limit."
            ),
        )

    if resolved_end > today:
        raise HTTPException(
            status_code=422,
            detail="end_date cannot be in the future.",
        )

    try:
        return fetch_donki_events(
            event_type=event_type,
            start_date=resolved_start,
            end_date=resolved_end,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except DonkiUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "error": "donki_upstream_unavailable",
                "message": exc.public_message,
            },
        ) from exc
