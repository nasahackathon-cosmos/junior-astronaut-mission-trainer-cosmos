"""Tests for the NASA CCMC DONKI integration."""

from datetime import date, timedelta
import json
import unittest
from unittest.mock import MagicMock, patch

import httpx
from fastapi.testclient import TestClient

from backend.donki.config import DonkiSettings
from backend.donki.service import DonkiUpstreamError, fetch_donki_events
from backend.main import app


client = TestClient(app)


def stream_context(body=b"[]", status=200, headers=None):
    request = httpx.Request("GET", "https://example.test/get/FLR")
    response = httpx.Response(
        status,
        headers=headers,
        content=body,
        request=request,
    )
    manager = MagicMock()
    manager.__enter__.return_value = response
    manager.__exit__.return_value = False
    return manager


def fetch_payload(event_type, payload, **kwargs):
    body = json.dumps(payload).encode("utf-8")
    with patch(
        "backend.donki.service.httpx.stream",
        return_value=stream_context(body),
    ):
        return fetch_donki_events(
            event_type,
            date.today(),
            date.today(),
            **kwargs,
        )


class TestDonkiSettings(unittest.TestCase):
    def test_rejects_non_finite_timeouts(self):
        for value in ("nan", "inf", "-inf"):
            with self.subTest(timeout=value):
                with patch.dict(
                    "os.environ",
                    {"DONKI_TIMEOUT_SECONDS": value},
                    clear=True,
                ):
                    with self.assertRaises(ValueError):
                        DonkiSettings.from_environment()


class TestDonkiService(unittest.TestCase):
    def test_normalizes_flare_events(self):
        payload = [{
            "flrID": "flare-001",
            "beginTime": "2026-11-14T10:00Z",
            "peakTime": "2026-11-14T10:15Z",
            "endTime": "2026-11-14T10:30Z",
            "classType": "M1.2",
            "sourceLocation": "S12E34",
            "activeRegionNum": 1234,
            "instruments": [],
            "linkedEvents": [],
        }]
        result = fetch_payload("FLR", payload)
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["events"][0]["classification"], "M1.2")
        self.assertEqual(
            result["events"][0]["peak_time"], "2026-11-14T10:15Z"
        )

    def test_cme_analysis_is_normalized(self):
        payload = [{
            "activityID": "cme-001",
            "startTime": "2026-11-14T00:00Z",
            "cmeAnalyses": [
                {"isMostAccurate": False, "speed": 400},
                {
                    "isMostAccurate": True,
                    "type": "S",
                    "time": "2026-11-14T01:00Z",
                    "latitude": 10,
                    "longitude": 20,
                    "speed": 650,
                    "halfAngle": 45,
                },
            ],
        }]
        result = fetch_payload("CME", payload)
        analysis = result["events"][0]["analysis"]
        self.assertEqual(analysis["speed_km_s"], 650)
        self.assertTrue(analysis["is_most_accurate"])

    def test_gst_event_is_normalized(self):
        result = fetch_payload("GST", [{
            "gstID": "gst-001",
            "startTime": "2026-11-14T02:00Z",
            "instruments": [],
            "linkedEvents": [],
        }])
        event = result["events"][0]
        self.assertEqual(event["event_id"], "gst-001")
        self.assertEqual(event["start_time"], "2026-11-14T02:00Z")
        self.assertIsNone(event["classification"])

    def test_sep_event_is_normalized(self):
        result = fetch_payload("SEP", [{
            "sepID": "sep-001",
            "eventTime": "2026-11-14T03:00Z",
            "peakTime": "2026-11-14T04:00Z",
            "endTime": "2026-11-14T05:00Z",
            "sepType": "速",
            "sourceLocation": "S10W20",
            "activeRegionNum": 1234,
            "instruments": [],
            "linkedEvents": [],
        }])
        event = result["events"][0]
        self.assertEqual(event["event_id"], "sep-001")
        self.assertEqual(event["start_time"], "2026-11-14T03:00Z")
        self.assertEqual(event["peak_time"], "2026-11-14T04:00Z")
        self.assertEqual(event["classification"], "速")

    def test_empty_upstream_list_is_valid(self):
        result = fetch_payload("SEP", [])
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["events"], [])

    def test_limits_returned_events(self):
        payload = [{"flrID": f"event-{i}"} for i in range(5)]
        result = fetch_payload("FLR", payload, limit=2)
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["available_count"], 5)

    def test_rejects_malformed_cme_analysis(self):
        invalid_values = [
            ["not-an-object"],
            {},
            "",
            0,
        ]
        for value in invalid_values:
            with self.subTest(value=value):
                with self.assertRaises(DonkiUpstreamError):
                    fetch_payload("CME", [{"cmeAnalyses": value}])

    def test_rejects_malformed_event_records(self):
        with self.assertRaises(DonkiUpstreamError):
            fetch_payload("FLR", [{"instruments": "not-a-list"}])

    def test_rejects_invalid_date_range_and_limit(self):
        settings = DonkiSettings()
        with self.assertRaises(ValueError):
            fetch_donki_events(
                "FLR", date.today(), date.today() - timedelta(days=1)
            )
        with self.assertRaises(ValueError):
            fetch_donki_events(
                "FLR",
                date.today() - timedelta(days=30),
                date.today(),
                settings=settings,
            )
        with self.assertRaises(ValueError):
            fetch_donki_events(
                "FLR", date.today(), date.today(), limit=101
            )

    def test_accepts_exactly_30_inclusive_calendar_days(self):
        start = date.today() - timedelta(days=29)
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(b"[]"),
        ):
            result = fetch_donki_events("FLR", start, date.today())
        self.assertEqual(result["count"], 0)

    def test_timeout_becomes_safe_upstream_error(self):
        with patch(
            "backend.donki.service.httpx.stream",
            side_effect=httpx.TimeoutException("private timeout detail"),
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events("FLR", date.today(), date.today())
        self.assertEqual(caught.exception.status_code, 504)
        self.assertNotIn(
            "private timeout detail", caught.exception.public_message
        )

    def test_rate_limit_becomes_503(self):
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(status=429),
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events("FLR", date.today(), date.today())
        self.assertEqual(caught.exception.status_code, 503)

    def test_upstream_server_error_becomes_502(self):
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(status=500),
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events("FLR", date.today(), date.today())
        self.assertEqual(caught.exception.status_code, 502)

    def test_connection_error_becomes_503(self):
        request = httpx.Request("GET", "https://example.test")
        with patch(
            "backend.donki.service.httpx.stream",
            side_effect=httpx.ConnectError("private connection detail", request=request),
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events("FLR", date.today(), date.today())
        self.assertEqual(caught.exception.status_code, 503)
        self.assertNotIn("private connection detail", caught.exception.public_message)

    def test_invalid_json_becomes_safe_upstream_error(self):
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(b"{invalid-json"),
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events("FLR", date.today(), date.today())
        self.assertEqual(caught.exception.status_code, 502)

    def test_non_list_json_becomes_safe_upstream_error(self):
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(b'{"unexpected": true}'),
        ):
            with self.assertRaises(DonkiUpstreamError):
                fetch_donki_events("FLR", date.today(), date.today())

    def test_oversized_stream_is_rejected(self):
        response = MagicMock()
        response.headers = {}
        response.raise_for_status.return_value = None
        response.iter_bytes.return_value = iter([b"x" * 1025])
        manager = MagicMock()
        manager.__enter__.return_value = response
        manager.__exit__.return_value = False
        settings = DonkiSettings(max_response_bytes=1024)

        with patch(
            "backend.donki.service.httpx.stream",
            return_value=manager,
        ):
            with self.assertRaises(DonkiUpstreamError) as caught:
                fetch_donki_events(
                    "FLR", date.today(), date.today(), settings=settings
                )
        self.assertIn("size limit", caught.exception.public_message)

    def test_content_length_over_limit_is_rejected(self):
        settings = DonkiSettings(max_response_bytes=1024)
        with patch(
            "backend.donki.service.httpx.stream",
            return_value=stream_context(
                b"[]", headers={"Content-Length": "2048"}
            ),
        ):
            with self.assertRaises(DonkiUpstreamError):
                fetch_donki_events(
                    "FLR", date.today(), date.today(), settings=settings
                )


class TestDonkiRoutes(unittest.TestCase):
    def test_donki_route_is_registered(self):
        with patch(
            "backend.donki.routes.fetch_donki_events",
            return_value={
                "source": "NASA CCMC DONKI",
                "event_type": "FLR",
                "count": 0,
                "events": [],
            },
        ):
            response = client.get(
                "/api/donki/events",
                params={
                    "event_type": "FLR",
                    "start_date": date.today().isoformat(),
                    "end_date": date.today().isoformat(),
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["source"], "NASA CCMC DONKI")

    def test_default_date_range_is_accepted(self):
        with patch(
            "backend.donki.routes.fetch_donki_events",
            return_value={"count": 0, "events": []},
        ) as fetch:
            response = client.get("/api/donki/events")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(fetch.call_args.kwargs["end_date"], date.today())
        self.assertEqual(
            fetch.call_args.kwargs["start_date"],
            date.today() - timedelta(days=6),
        )

    def test_invalid_event_type_is_rejected(self):
        response = client.get(
            "/api/donki/events", params={"event_type": "INVALID"}
        )
        self.assertEqual(response.status_code, 422)

    def test_reversed_dates_are_rejected(self):
        response = client.get(
            "/api/donki/events",
            params={
                "start_date": date.today().isoformat(),
                "end_date": (date.today() - timedelta(days=1)).isoformat(),
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_future_end_date_is_rejected(self):
        future = date.today() + timedelta(days=1)
        response = client.get(
            "/api/donki/events", params={"end_date": future.isoformat()}
        )
        self.assertEqual(response.status_code, 422)

    def test_31_inclusive_calendar_days_are_rejected(self):
        response = client.get(
            "/api/donki/events",
            params={
                "start_date": (date.today() - timedelta(days=30)).isoformat(),
                "end_date": date.today().isoformat(),
            },
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
