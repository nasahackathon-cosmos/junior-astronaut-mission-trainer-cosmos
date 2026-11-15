"""Tests for the game-facing mission engine and API contract."""

from fastapi.testclient import TestClient

from backend.game_data import CAMPAIGN_SEQUENCE, generate_mission_package, select_mission, validate_mission_completion
from backend.main import app


def test_selection_follows_the_authoritative_30_day_sequence():
    for environment in ("mars", "moon"):
        history = []
        for day, mission_id in enumerate(CAMPAIGN_SEQUENCE, start=1):
            mission = select_mission(environment, day, "player-a", history)
            assert mission["mission_id"] == mission_id
            assert mission["game_context"]["day"] == day
            assert mission["game_context"]["objectives"]
            history.append(mission_id)


def test_environments_produce_distinct_valid_contexts():
    mars = select_mission("mars", 1, "player-a", [])
    moon = select_mission("moon", 1, "player-a", [])
    assert mars["game_context"]["environment"] == "mars"
    assert moon["game_context"]["environment"] == "moon"


def test_next_day_is_locked_until_previous_day_is_recorded():
    try:
        select_mission("mars", 2, "player-a", [])
    except ValueError as exc:
        assert "locked" in str(exc)
    else:
        raise AssertionError("Day 2 should require a completed Day 1")


def test_selector_rejects_skips_and_duplicates():
    for history in (["M002"], ["M001", "M001"]):
        try:
            select_mission("mars", len(history) + 1, "player-a", history)
        except ValueError as exc:
            assert "order" in str(exc)
        else:
            raise AssertionError("invalid history should be rejected")


def test_day_24_has_destination_specific_branches():
    history = list(CAMPAIGN_SEQUENCE[:23])
    mars = select_mission("mars", 24, "player-a", history)
    moon = select_mission("moon", 24, "player-a", history)
    assert mars["mission_id"] == moon["mission_id"] == "M024"
    assert mars["game_context"]["branch"] == "rover-recovery"
    assert moon["game_context"]["branch"] == "lunar-artifact-investigation"
    assert mars["game_context"]["objectives"] != moon["game_context"]["objectives"]


def test_every_campaign_day_has_playable_action_metadata():
    history = []
    for day, mission_id in enumerate(CAMPAIGN_SEQUENCE, start=1):
        mission = select_mission("mars", day, "player-a", history)
        objectives = mission["game_context"]["objectives"]
        assert mission["game_context"]["world"] in {"spacecraft", "surface", "return"}
        assert all(item["id"].startswith(mission_id.lower() + "-") for item in objectives)
        assert all(item["completion_action"] and item["target"] and item["activity"] for item in objectives)
        history.append(mission_id)


def test_completion_requires_all_current_objectives_and_returns_next_day():
    mission = select_mission("mars", 1, "player-a", [])
    objectives = [item["id"] for item in mission["game_context"]["objectives"]]
    result = validate_mission_completion("mars", 1, "M001", "player-a", [], objectives)
    assert result["completed"] is True
    assert result["next_mission_id"] == "M002"
    try:
        validate_mission_completion("mars", 1, "M001", "player-a", [], objectives[:-1])
    except ValueError as exc:
        assert "required" in str(exc)
    else:
        raise AssertionError("incomplete objectives should be rejected")


def test_game_api_and_frontend_are_available():
    client = TestClient(app)
    assert client.get("/api/game/config").status_code == 200
    response = client.post(
        "/api/game/select-mission",
        json={"environment": "moon", "day": 1, "player_seed": "demo", "history": []},
    )
    assert response.status_code == 200
    assert response.json()["game_context"]["environment"] == "moon"
    assert client.get("/").status_code == 200


def test_game_api_rejects_invalid_progression():
    client = TestClient(app)
    response = client.post(
        "/api/game/select-mission",
        json={"environment": "mars", "day": 31, "player_seed": "demo", "history": []},
    )
    assert response.status_code == 422


def test_game_api_validates_mission_completion():
    client = TestClient(app)
    mission = select_mission("moon", 1, "demo", [])
    objectives = [item["id"] for item in mission["game_context"]["objectives"]]
    response = client.post(
        "/api/game/complete-mission",
        json={
            "environment": "moon",
            "day": 1,
            "mission_id": "M001",
            "player_seed": "demo",
            "history": [],
            "completed_objectives": objectives,
        },
    )
    assert response.status_code == 200
    assert response.json()["next_mission_id"] == "M002"


def test_completion_rejects_incorrect_action_evidence():
    mission = select_mission("mars", 1, "demo", [])
    objectives = mission["game_context"]["objectives"]
    ids = [item["id"] for item in objectives]
    evidence = {item["id"]: "wrong-action" for item in objectives}
    try:
        validate_mission_completion("mars", 1, "M001", "demo", [], ids, evidence)
    except ValueError as exc:
        assert "evidence" in str(exc)
    else:
        raise AssertionError("incorrect action evidence should be rejected")


def test_mission_package_has_valid_labelled_fallback_without_ai(monkeypatch):
    monkeypatch.delenv("COSMOS_AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    package = generate_mission_package("moon", 1, "demo", [])
    assert package["mission_id"] == "M001"
    assert package["ai_generated"] is False
    assert package["source"] == "catalogue_fallback"
    assert 2 <= len(package["actions"]) <= 3
