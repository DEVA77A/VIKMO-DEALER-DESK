import os
import sys
import csv
from pathlib import Path
import pandas as pd
import numpy as np

base_dir = Path(__file__).resolve().parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

WEEKS = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]

DIWALI_MAP = {
    2024: pd.to_datetime("2024-11-01"),
    2025: pd.to_datetime("2025-10-21"),
    2026: pd.to_datetime("2026-11-08"),
}


def get_weeks_to_diwali(dt: pd.Timestamp) -> int:
    target = DIWALI_MAP[dt.year]
    return (target - dt).days // 7


def generate_forecast(data_dir: Path, output_file: Path) -> pd.DataFrame:
    """
    Generates 4-week demand forecasts for all 40 SKUs in lead_times.csv
    incorporating promotional calendar, Diwali festive seasonality,
    and intermittent demand handling.
    """
    sales_file = data_dir / "sales_history.csv"
    lead_file = data_dir / "lead_times.csv"
    promo_file = data_dir / "promo_calendar.csv"

    sales = pd.read_csv(sales_file)
    sales["week_start"] = pd.to_datetime(sales["week_start"])
    sales["diwali_date"] = sales["week_start"].dt.year.map(DIWALI_MAP)
    sales["weeks_to_diwali"] = (sales["diwali_date"] - sales["week_start"]).dt.days // 7

    lead = pd.read_csv(lead_file)
    promo = pd.read_csv(promo_file)
    promo["week_start"] = pd.to_datetime(promo["week_start"])

    # Lookup map for future promotions
    promo_lookup = {(r["sku"], r["week_start"].strftime("%Y-%m-%d")): r["promo_flag"] for _, r in promo.iterrows()}

    skus = lead["sku"].tolist()
    forecast_rows = []

    for sku in skus:
        sku_sales = sales[sales["sku"] == sku].sort_values("week_start").copy()

        zero_ratio = (sku_sales["units_sold"] == 0).mean() if len(sku_sales) > 0 else 1.0
        is_short = len(sku_sales) < 12
        is_intermittent = zero_ratio > 0.4 or sku_sales["units_sold"].mean() < 2.0

        if is_intermittent:
            # Croston / moving average for slow-moving parts; avoid promotional inflation
            base_units = sku_sales["units_sold"].tail(12).mean()
            for w in WEEKS:
                forecast_rows.append({
                    "sku": sku,
                    "week_start": w,
                    "forecast_units": round(float(max(0.0, base_units)), 1),
                })
        elif is_short:
            # For newly introduced SKUs (e.g. BRK-1105, CHN-1006 with only 6 weeks of data)
            non_promo = sku_sales[sku_sales["promo_flag"] == 0]
            base_units = non_promo["units_sold"].mean() if len(non_promo) > 0 else sku_sales["units_sold"].mean()
            for w in WEEKS:
                is_promo = promo_lookup.get((sku, w), 0)
                pred = base_units * 2.0 if is_promo == 1 else base_units
                forecast_rows.append({
                    "sku": sku,
                    "week_start": w,
                    "forecast_units": round(float(max(0.0, pred)), 1),
                })
        else:
            # Established SKUs: decompose recent base, Diwali festive lift, and promotional multiplier
            non_promo = sku_sales[sku_sales["promo_flag"] == 0]
            recent_base = non_promo["units_sold"].tail(8).mean() if len(non_promo) >= 4 else sku_sales["units_sold"].tail(4).mean()

            promo_rows = sku_sales[sku_sales["promo_flag"] == 1]
            if len(promo_rows) >= 2 and len(non_promo) > 0:
                promo_ratio = promo_rows["units_sold"].mean() / (non_promo["units_sold"].mean() or 1.0)
                promo_ratio = float(np.clip(promo_ratio, 1.2, 3.0))
            else:
                promo_ratio = 2.0

            for w in WEEKS:
                w_dt = pd.to_datetime(w)
                is_promo = promo_lookup.get((sku, w), 0)
                w_diwali = get_weeks_to_diwali(w_dt)

                # Prior year Diwali uplift for this relative distance
                diwali_hist = non_promo[non_promo["weeks_to_diwali"] == w_diwali]
                diwali_lift = 1.0
                if len(diwali_hist) > 0 and non_promo["units_sold"].mean() > 0:
                    lift_val = diwali_hist["units_sold"].mean() / non_promo["units_sold"].mean()
                    diwali_lift = float(np.clip(lift_val, 0.85, 2.5))

                pred = recent_base * diwali_lift
                if is_promo == 1:
                    pred *= promo_ratio

                forecast_rows.append({
                    "sku": sku,
                    "week_start": w,
                    "forecast_units": round(float(max(0.0, pred)), 1),
                })

    df = pd.DataFrame(forecast_rows)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_file, index=False)
    return df


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"
    output_file = base_dir / "ml" / "forecast.csv"
    print(f"Generating forecast from {data_dir} to {output_file}...")
    df = generate_forecast(data_dir=data_dir, output_file=output_file)
    print(f"Generated {len(df)} rows across {df['sku'].nunique()} SKUs.")
