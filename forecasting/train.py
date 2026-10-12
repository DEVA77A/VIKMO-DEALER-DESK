import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from forecasting.evaluate import run_temporal_validation
from forecasting.predict import generate_forecast
import pandas as pd


def main():
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"
    forecast_output = base_dir / "ml" / "forecast.csv"

    print("==================================================")
    print("STEP 1: Temporal Validation Against Baselines")
    print("==================================================")
    for cutoff in ["2026-08-24", "2026-07-27"]:
        res = run_temporal_validation(data_dir=data_dir, cutoff_date=pd.to_datetime(cutoff))
        print(f"\n[Validation Cutoff: {res['cutoff']}]")
        print(f"  Naive (Last Observed): MAE={res['naive']['mae']:.2f}, WAPE={res['naive']['wape']:.3f}")
        print(f"  Moving Average (4-wk): MAE={res['moving_average']['mae']:.2f}, WAPE={res['moving_average']['wape']:.3f}")
        print(f"  Seasonal Naive (Lag52): MAE={res['seasonal_naive']['mae']:.2f}, WAPE={res['seasonal_naive']['wape']:.3f}")
        print(f"  Selected Model       : MAE={res['candidate']['mae']:.2f}, WAPE={res['candidate']['wape']:.3f} (Best)")

    print("\n==================================================")
    print("STEP 2: Generating ml/forecast.csv")
    print("==================================================")
    df = generate_forecast(data_dir=data_dir, output_file=forecast_output)
    print(f"Successfully generated {forecast_output}: {len(df)} rows across {df['sku'].nunique()} SKUs.")


if __name__ == "__main__":
    main()
