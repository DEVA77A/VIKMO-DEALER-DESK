import csv
import math
from pathlib import Path
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient
from core.models import Product


class ForecastingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]
        self.product = Product.objects.create(
            sku="FIL-1016",
            name="Oil Filter - Bajaj Pulsar",
            category="Filters",
            brand="Uno Minda",
            vehicle_fitment="Bajaj Pulsar 150",
            price="450.00",
            stock=40,
            description="High quality oil filter",
        )

    def test_forecast_csv_file_structure(self):
        forecast_path = Path(settings.BASE_DIR) / "ml" / "forecast.csv"
        self.assertTrue(forecast_path.exists())

        with open(forecast_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        self.assertEqual(reader.fieldnames, ["sku", "week_start", "forecast_units"])
        self.assertEqual(len(rows), 160)

        skus = {r["sku"] for r in rows}
        self.assertEqual(len(skus), 40)

        weeks = {r["week_start"] for r in rows}
        self.assertEqual(sorted(list(weeks)), self.weeks)

        for r in rows:
            val = float(r["forecast_units"])
            self.assertGreaterEqual(val, 0)

    def test_forecast_endpoint_valid_and_404(self):
        resp = self.client.get("/api/forecast/FIL-1016/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["sku"], "FIL-1016")
        self.assertEqual(len(data["forecast"]), 4)
        for idx, item in enumerate(data["forecast"]):
            self.assertEqual(item["week_start"], self.weeks[idx])
            self.assertIsInstance(item["forecast_units"], (int, float))

        # Unknown SKU -> 404
        r404 = self.client.get("/api/forecast/NON-EXISTENT-SKU/")
        self.assertEqual(r404.status_code, 404)
        self.assertEqual(r404.json()["error"]["code"], "NOT_FOUND")

    def test_reorder_suggestions_endpoint(self):
        resp = self.client.get("/api/reorder-suggestions/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("results", data)
        results = data["results"]
        self.assertEqual(len(results), 40)

        for entry in results:
            for field in [
                "sku",
                "current_stock",
                "lead_time_weeks",
                "lead_time_demand",
                "safety_stock",
                "reorder_point",
                "reorder_qty",
            ]:
                self.assertIn(field, entry)

            # Check math constraints
            self.assertGreaterEqual(entry["lead_time_weeks"], 1)
            self.assertGreaterEqual(entry["safety_stock"], 0)
            self.assertGreaterEqual(entry["reorder_qty"], 0)
            expected_reorder_point = round(entry["lead_time_demand"] + entry["safety_stock"], 1)
            self.assertAlmostEqual(entry["reorder_point"], expected_reorder_point, places=1)

            expected_reorder_qty = max(0, math.ceil(entry["reorder_point"] - entry["current_stock"]))
            self.assertEqual(entry["reorder_qty"], expected_reorder_qty)

    def test_reorder_uses_live_current_stock(self):
        # Initial check for FIL-1016
        resp = self.client.get("/api/reorder-suggestions/")
        entry = next(item for item in resp.json()["results"] if item["sku"] == "FIL-1016")
        self.assertEqual(entry["current_stock"], 40)
        initial_reorder_qty = entry["reorder_qty"]

        # Update live stock via inventory endpoint
        self.client.put("/api/inventory/FIL-1016/", {"quantity": 300}, format="json")

        # Check reorder suggestions again
        resp2 = self.client.get("/api/reorder-suggestions/")
        entry2 = next(item for item in resp2.json()["results"] if item["sku"] == "FIL-1016")
        self.assertEqual(entry2["current_stock"], 300)
        # Since stock is now 300 (exceeding reorder_point), reorder_qty must be 0
        self.assertEqual(entry2["reorder_qty"], 0)
