import os
from pathlib import Path
import pandas as pd
import numpy as np

DIWALI_MAP = {
    2024: pd.to_datetime("2024-11-01"),
    2025: pd.to_datetime("2025-10-21"),
    2026: pd.to_datetime("2026-11-08"),
}


def load_data(data_dir: Path):
    sales = pd.read_csv(data_dir / "sales_history.csv")
    sales["week_start"] = pd.to_datetime(sales["week_start"])
    sales["diwali_date"] = sales["week_start"].dt.year.map(DIWALI_MAP)
    sales["weeks_to_diwali"] = (sales["diwali_date"] - sales["week_start"]).dt.days // 7
    lead = pd.read_csv(data_dir / "lead_times.csv")
    return sales, lead


def evaluate_predictions(actual_df, pred_df):
    merged = pd.merge(actual_df, pred_df, on=["sku", "week_start"], suffixes=("_actual", "_pred"))
    y_true = merged["units_sold"].values
    y_pred = np.maximum(0, merged["forecast_units"].values)

    mae = np.mean(np.abs(y_true - y_pred))
    wape = np.sum(np.abs(y_true - y_pred)) / np.sum(y_true)
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    return mae, wape, rmse


def run_temporal_validation(data_dir: Path, cutoff_date: pd.Timestamp, horizon_weeks: int = 4):
    sales, lead = load_data(data_dir)
    train_sales = sales[sales["week_start"] < cutoff_date].copy()
    test_sales = sales[
        (sales["week_start"] >= cutoff_date)
        & (sales["week_start"] < cutoff_date + pd.Timedelta(weeks=horizon_weeks))
    ].copy()

    skus = lead["sku"].unique()
    test_weeks = sorted(test_sales["week_start"].unique())

    # 1. Baseline 1: Last Observed Weekly Sales
    b1_preds = []
    for sku in skus:
        sku_train = train_sales[train_sales["sku"] == sku].sort_values("week_start")
        last_val = sku_train["units_sold"].iloc[-1] if len(sku_train) > 0 else 0
        for w in test_weeks:
            b1_preds.append({"sku": sku, "week_start": w, "forecast_units": float(last_val)})
    b1_df = pd.DataFrame(b1_preds)
    b1_mae, b1_wape, b1_rmse = evaluate_predictions(test_sales, b1_df)

    # 2. Baseline 2: 4-week Moving Average
    b2_preds = []
    for sku in skus:
        sku_train = train_sales[train_sales["sku"] == sku].sort_values("week_start")
        ma_val = sku_train["units_sold"].tail(4).mean() if len(sku_train) > 0 else 0
        for w in test_weeks:
            b2_preds.append({"sku": sku, "week_start": w, "forecast_units": float(ma_val)})
    b2_df = pd.DataFrame(b2_preds)
    b2_mae, b2_wape, b2_rmse = evaluate_predictions(test_sales, b2_df)

    # 3. Baseline 3: Same-Week-Last-Year (52 weeks lag)
    b3_preds = []
    for sku in skus:
        sku_train = train_sales[train_sales["sku"] == sku].set_index("week_start")
        for w in test_weeks:
            last_year_w = w - pd.DateOffset(weeks=52)
            if last_year_w in sku_train.index:
                val = sku_train.loc[last_year_w, "units_sold"]
            else:
                val = sku_train["units_sold"].tail(4).mean() if len(sku_train) > 0 else 0
            b3_preds.append({"sku": sku, "week_start": w, "forecast_units": float(val)})
    b3_df = pd.DataFrame(b3_preds)
    b3_mae, b3_wape, b3_rmse = evaluate_predictions(test_sales, b3_df)

    # 4. Candidate Model
    cand_preds = []
    for sku in skus:
        sku_train = train_sales[train_sales["sku"] == sku].sort_values("week_start").copy()
        sku_test = test_sales[test_sales["sku"] == sku].sort_values("week_start").copy()

        zero_ratio = (sku_train["units_sold"] == 0).mean() if len(sku_train) > 0 else 1.0
        is_short = len(sku_train) < 12
        is_intermittent = zero_ratio > 0.4 or sku_train["units_sold"].mean() < 2.0

        if is_intermittent:
            val = sku_train["units_sold"].tail(12).mean() if len(sku_train) > 0 else 0.5
            for w in test_weeks:
                cand_preds.append({"sku": sku, "week_start": w, "forecast_units": float(val)})
        elif is_short:
            non_promo = sku_train[sku_train["promo_flag"] == 0]
            baseline_val = non_promo["units_sold"].mean() if len(non_promo) > 0 else sku_train["units_sold"].mean()
            for _, r in sku_test.iterrows():
                val = baseline_val * 2.0 if r["promo_flag"] == 1 else baseline_val
                cand_preds.append({"sku": sku, "week_start": r["week_start"], "forecast_units": float(val)})
        else:
            non_promo = sku_train[sku_train["promo_flag"] == 0]
            recent_base = non_promo["units_sold"].tail(8).mean() if len(non_promo) >= 4 else sku_train["units_sold"].tail(4).mean()

            promo_rows = sku_train[sku_train["promo_flag"] == 1]
            if len(promo_rows) >= 2 and len(non_promo) > 0:
                promo_ratio = promo_rows["units_sold"].mean() / (non_promo["units_sold"].mean() or 1.0)
                promo_ratio = np.clip(promo_ratio, 1.2, 3.0)
            else:
                promo_ratio = 2.0

            for _, r in sku_test.iterrows():
                w = r["week_start"]
                promo_flag = r["promo_flag"]
                w_diwali = r["weeks_to_diwali"]

                diwali_hist = non_promo[non_promo["weeks_to_diwali"] == w_diwali]
                diwali_lift = 1.0
                if len(diwali_hist) > 0 and non_promo["units_sold"].mean() > 0:
                    lift_val = diwali_hist["units_sold"].mean() / non_promo["units_sold"].mean()
                    diwali_lift = float(np.clip(lift_val, 0.85, 2.5))

                pred = recent_base * diwali_lift
                if promo_flag == 1:
                    pred *= promo_ratio
                cand_preds.append({"sku": sku, "week_start": w, "forecast_units": float(pred)})

    cand_df = pd.DataFrame(cand_preds)
    c_mae, c_wape, c_rmse = evaluate_predictions(test_sales, cand_df)

    return {
        "cutoff": cutoff_date.strftime("%Y-%m-%d"),
        "naive": {"mae": b1_mae, "wape": b1_wape, "rmse": b1_rmse},
        "moving_average": {"mae": b2_mae, "wape": b2_wape, "rmse": b2_rmse},
        "seasonal_naive": {"mae": b3_mae, "wape": b3_wape, "rmse": b3_rmse},
        "candidate": {"mae": c_mae, "wape": c_wape, "rmse": c_rmse},
    }


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"
    for cutoff in ["2026-08-24", "2026-07-27", "2026-06-29"]:
        res = run_temporal_validation(data_dir=data_dir, cutoff_date=pd.to_datetime(cutoff))
        print(f"\n--- Cutoff {res['cutoff']} ---")
        print(f"Naive           : MAE={res['naive']['mae']:.2f}, WAPE={res['naive']['wape']:.3f}, RMSE={res['naive']['rmse']:.2f}")
        print(f"Moving Average  : MAE={res['moving_average']['mae']:.2f}, WAPE={res['moving_average']['wape']:.3f}, RMSE={res['moving_average']['rmse']:.2f}")
        print(f"Seasonal Naive  : MAE={res['seasonal_naive']['mae']:.2f}, WAPE={res['seasonal_naive']['wape']:.3f}, RMSE={res['seasonal_naive']['rmse']:.2f}")
        print(f"Candidate Model : MAE={res['candidate']['mae']:.2f}, WAPE={res['candidate']['wape']:.3f}, RMSE={res['candidate']['rmse']:.2f}")
