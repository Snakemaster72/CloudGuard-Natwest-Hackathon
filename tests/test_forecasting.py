import os

import pandas as pd

from src.data_generator import generate_mock_data, to_prophet_format
from src.forecasting import detect_anomalies, train_predict


def test_data_generation_schema():
    df = generate_mock_data(output_path="data/test_costs.csv", days=30, seed=1)
    assert len(df) > 0
    assert set(["date", "value"]).issubset(df.columns)
    assert os.path.exists("data/test_costs.csv")
    os.remove("data/test_costs.csv")


def test_forecast_output_columns_and_length():
    raw = generate_mock_data(output_path="data/test_costs.csv", days=60, seed=2)
    df = to_prophet_format(raw)

    _model, forecast = train_predict(df, periods=7)
    assert len(forecast) == 60 + 7
    assert {"yhat", "yhat_lower", "yhat_upper"}.issubset(forecast.columns)

    os.remove("data/test_costs.csv")


def test_anomaly_detection_flags_spike():
    df = pd.DataFrame({"ds": pd.date_range(start="2023-01-01", periods=20, freq="D"), "y": [100] * 19 + [1000]})
    _model, forecast = train_predict(df, periods=0)
    anomalies = detect_anomalies(df, forecast)
    assert not anomalies.empty
    assert anomalies["y"].max() == 1000
