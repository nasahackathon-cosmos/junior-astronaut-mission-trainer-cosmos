"""FastAPI application for the Junior Astronaut Mission Trainer."""

import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .mission_data import (
    MissionDataError,
    get_data_summary,
    get_mission,
    get_mission_evidence,
    list_missions,
)
from .terrain.routes import terrain_router
from .terrain.mission_routes import mission_terrain_router
from .donki.routes import donki_router
from .game_data import get_game_config, generate_mission_package, select_mission, validate_mission_completion

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Junior Astronaut Mission Trainer API",
    description=(
        "Educational mission catalogue with independent NASA OSDR, "
        "RadLab, MOLA/Jezero terrain, Canadian Space Agency, and DONKI "
        "food-production references. "
        "Research evidence, educational references, and simulated game "
        "state are distinguished."
    ),
    version="1.1.0",
)

app.include_router(terrain_router)
app.include_router(mission_terrain_router)
app.include_router(donki_router)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


@app.get("/api/game/config", tags=["Game"])
def game_config() -> dict[str, Any]:
    """Return configurable game mechanics and supported environments."""
    return get_game_config()


@app.post("/api/game/select-mission", tags=["Game"])
def game_select_mission(payload: dict[str, Any]) -> dict[str, Any]:
    """Select a reproducible catalogue mission for the current local player state."""
    try:
        environment = str(payload.get("environment", ""))
        day = int(payload.get("day", 0))
        seed = str(payload.get("player_seed", ""))
        history = payload.get("history", [])
        if not seed or not isinstance(history, list) or len(history) > 30:
            raise ValueError("player_seed and a history list are required")
        return select_mission(environment, day, seed, [str(item) for item in history])
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/game/complete-mission", tags=["Game"])
def game_complete_mission(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate one mission's objectives and return the next campaign day."""
    try:
        environment = str(payload.get("environment", ""))
        day = int(payload.get("day", 0))
        mission_id = str(payload.get("mission_id", ""))
        seed = str(payload.get("player_seed", ""))
        history = payload.get("history", [])
        objectives = payload.get("completed_objectives", [])
        evidence = payload.get("objective_evidence", {})
        if not isinstance(history, list) or not isinstance(objectives, list) or not isinstance(evidence, dict):
            raise ValueError("history and completed_objectives must be lists; objective_evidence must be an object")
        return validate_mission_completion(
            environment,
            day,
            mission_id,
            seed,
            [str(item) for item in history],
            [str(item) for item in objectives],
            evidence,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/game/generate-mission", tags=["Game"])
def game_generate_mission(payload: dict[str, Any]) -> dict[str, Any]:
    """Return one validated cached-ready mission package for the current campaign day."""
    try:
        environment = str(payload.get("environment", ""))
        day = int(payload.get("day", 0))
        seed = str(payload.get("player_seed", ""))
        history = payload.get("history", [])
        if not seed or not isinstance(history, list) or len(history) > 30:
            raise ValueError("player_seed and a history list are required")
        return generate_mission_package(environment, day, seed, [str(item) for item in history])
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.exception_handler(MissionDataError)
async def mission_data_error_handler(
    request: Request, exc: MissionDataError
):
    logger.exception("Mission data unavailable: %s", exc)
    return JSONResponse(
        status_code=503,
        content={
            "error": "mission_data_unavailable",
            "detail": exc.public_detail,
        },
    )


@app.get("/api/health", tags=["System"])
def health():
    """Basic backend health check."""
    return {"status": "ok", "service": "junior-astronaut-mission-trainer"}


@app.get("/api/data-summary", tags=["Data"])
def data_summary():
    """Return catalogue and independent evidence-source counts."""
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
    """Return independent OSDR, RadLab, CSA, and MOLA references."""
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


if FRONTEND_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/", include_in_schema=False)
    def frontend():
        from fastapi.responses import FileResponse

        return FileResponse(FRONTEND_DIR / "index.html")
