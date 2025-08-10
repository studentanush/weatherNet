# test_prediction_plot.py
import os
import sys
import torch
import numpy as np
import joblib
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, timezone
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models_code.model_5 import SpikeAwareHybrid
from final.final_fetch import fetch_weatherbit_data

# ==== CONFIG ====
MODEL_PATH = "models/spike_aware_q95_seq24.pth40"
SCALER_PATH = "scalers/feature_scaler_seq24.pkl"
SEQ_LEN = 24
API_KEY = "777628119ce049d484833355dbeca175"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]
TARGET = "ALLSKY_SFC_SW_DWN"

def prepare_input(df, scaler):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    return torch.tensor(df_scaled, dtype=torch.float32, device=DEVICE)

def sliding_window_predict(df, model, scaler):
    predictions = []
    actuals = []
    timestamps = []

    tensor_data = prepare_input(df, scaler)

    for i in range(SEQ_LEN, len(df)):
        seq_input = tensor_data[i-SEQ_LEN:i].unsqueeze(0)
        with torch.no_grad():
            pred_log = model(seq_input).item()
        pred_wm2 = np.expm1(pred_log)

        predictions.append(pred_wm2)
        actuals.append(df[TARGET].iloc[i])
        timestamps.append(df.index[i])

    return timestamps, actuals, predictions

if __name__ == "__main__":
    # Coordinates
    lat = float(input("Enter latitude: "))
    lon = float(input("Enter longitude: "))

    print("📡 Fetching last 7 days weather data...")
    end_time = datetime.now(tz=timezone.utc) 
    start_time = end_time - timedelta(days=7)

    # We modify fetch to handle date range (manually inlined)
    from final.final_fetch import compute_additional_features, add_time_features
    import requests

    API_URL = "https://api.weatherbit.io/v2.0/history/hourly"
    params = {
        "lat": lat,
        "lon": lon,
        "key": API_KEY,
        "start_date": start_time.strftime("%Y-%m-%d:%H"),
        "end_date": end_time.strftime("%Y-%m-%d:%H")
    }
    r = requests.get(API_URL, params=params)
    r.raise_for_status()
    data = r.json()['data']

    df = pd.DataFrame(data)
    df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'], utc=True)
    df.set_index('timestamp_utc', inplace=True)
    df.index = df.index.tz_convert('Asia/Kolkata')
    df = add_time_features(df)
    df = compute_additional_features(df, lat)

    print(f"✅ Data shape: {df.shape}")

    scaler = joblib.load(SCALER_PATH)
    model = SpikeAwareHybrid(input_size=len(FEATURES)).to(DEVICE)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    print("⚡ Running sliding window predictions...")
    timestamps, actuals, preds = sliding_window_predict(df, model, scaler)
    rmse = root_mean_squared_error(actuals, preds)
    mae = mean_absolute_error(actuals, preds)
    r2 = r2_score(actuals, preds)
    print(rmse)
    print(mae)
    print(r2)
    # === Plot ===
    plt.figure(figsize=(14, 6))
    plt.plot(timestamps, actuals, label="Actual", color="blue")
    plt.plot(timestamps, preds, label="Predicted", color="orange")
    plt.xlabel("Date-Time")
    plt.ylabel("Solar Radiation (W/m²)")
    plt.title(f"Actual vs Predicted Solar Radiation (Last 7 Days, SEQ_LEN={SEQ_LEN})")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("models/last7days_comparison.png", dpi=300)
    plt.show()

    print("📊 Plot saved as models/last7days_comparison.png")
