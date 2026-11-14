import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from starlette.requests import Request

from backend.main import mission_data_error_handler
from backend import mission_data


def make_request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/data-summary",
        "raw_path": b"/api/data-summary",
        "query_string": b"",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "scheme": "http",
    }
    return Request(scope)


class MissionDataErrorAPITests(unittest.TestCase):

    def test_missing_file_error_does_not_expose_filesystem_path(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "private" / "missing.json"
            with self.assertRaises(mission_data.MissionDataError) as context:
                mission_data._load_json(missing)

        response = asyncio.run(
            mission_data_error_handler(make_request(), context.exception)
        )
        payload = json.loads(response.body)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            payload["detail"],
            "Required mission data is unavailable.",
        )
        self.assertNotIn(str(missing), response.body.decode())
        self.assertNotIn("/private/", response.body.decode())

    def test_missing_mola_dataset_error_does_not_expose_filesystem_path(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_root = Path(directory)
            mapping = {
                "module": "MOLA",
                "source": "NASA",
                "region": "Jezero",
                "coverage": {},
                "terrain_categories": {},
                "limitations": [],
                "mission_count": 1,
                "missions": [{
                    "mission_id": "M001",
                    "title": "Test",
                    "role": "Test",
                    "usage": "Test",
                    "limitation": "Test",
                    "data_type": "Test",
                    "datasets": ["private/missing.json"],
                }],
            }

            with self.assertRaises(mission_data.MissionDataError) as context:
                mission_data._validate_mola_mapping(
                    mapping,
                    {"M001"},
                    missing_root,
                )

        response = asyncio.run(
            mission_data_error_handler(make_request(), context.exception)
        )
        payload = json.loads(response.body)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            payload["detail"],
            "A configured MOLA dataset is unavailable.",
        )
        self.assertNotIn(str(missing_root), response.body.decode())
        self.assertNotIn("private/missing.json", response.body.decode())


if __name__ == "__main__":
    unittest.main()
