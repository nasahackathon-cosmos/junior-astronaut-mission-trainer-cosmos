"""FastAPI application for the Junior Astronaut Mission Trainer."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .mission_data import (
    MissionDataError,
    get_data_summary,
    get_mission,
    get_mission_evidence,
    list_missions,
)

app = FastAPI(
    title="Junior Astronaut Mission Trainer API",
    description=(
        "Educational mission catalogue with independent NASA OSDR, "
        "RadLab, and Canadian Space Agency food-production references. "
        "Research evidence, educational references, and simulated game "
        "state are distinguished."
    ),
    version="1.1.0",
)


@app.exception_handler(MissionDataError)
async def mission_data_error_handler(
    request: Request, exc: MissionDataError
):
    return JSONResponse(
        status_code=503,
        content={
            "error": "mission_data_unavailable",
            "detail": str(exc),
        },
    )


@app.get("/api/health", tags=["System"])
def health():
    """Basic backend health check."""
    return {"status": "ok", "service": "junior-astronaut-mission-trainer"}


@app.get("/api/data-summary", tags=["Data"])
def data_summary():
    """Return catalogue and OSDR, RadLab, and CSA source counts."""
    return get_data_summary()


@app.get("/api/missions", tags=["Missions"])
def missions():
    """Return all missions in catalogue order."""
    records = list_missions()
    return {
        "count": len(records),
        "missions": records,
    }


@app.get("/api/missions/{mission_id}/evidence", tags=["Evidence"])
def mission_evidence(mission_id: str):
    """Return independent OSDR, RadLab, and CSA references for a mission."""
    result = get_mission_evidence(mission_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Mission {mission_id} was not found.",
        )

    return result


@app.get("/api/missions/{mission_id}", tags=["Missions"])
def mission_detail(mission_id: str):
    """Return one mission by its canonical ID."""
    result = get_mission(mission_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Mission {mission_id} was not found.",
        )

    return result
