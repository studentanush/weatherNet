import torch
import numpy as np
import pandas as pd
from model import TimeSeriesTransformer
from sklearn.preprocessing import StandardScaler
import joblib
from fetch import fetch_and_return
from datetime import datetime, timedelta


MODEL_PATH = "models/version2.pth"
SCALER_PATH = "scalers/feature_scaler.pkl"
SEQ_LEN = 24
FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]
TARGET = "ALLSKY_SFC_SW_DWN"

def add_time_features(df):
    df['hour'] = df.index.hour
    df['month'] = df.index.month
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    return df

def get_last_24h(lat, lon, location):
    REAL_API_FEATURES = [
        "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
        "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
        "ALLSKY_SFC_LW_DWN", "T2M", "ALLSKY_SFC_SW_DWN"
    ]

    all_data = {}
    for param in REAL_API_FEATURES:
        df = fetch_and_return(param, lat, lon, location, days_ago=4)
        df = df[0]
        df = df.replace(-999.0, 0)
        all_data[param] = df.set_index("datetime")[param]

    df_full = pd.concat(all_data.values(), axis=1)
    df_full.columns = REAL_API_FEATURES
    df_full.index = pd.to_datetime(df_full.index)
    df_full = df_full.sort_index()

    # Add derived time features
    df_full = add_time_features(df_full)
    df_full = slice_24h_from_hour(df_full,datetime.now().hour)
    return df_full
def slice_24h_from_hour(df, target_hour=0):
    # Ensure datetime index
    df = df.sort_index()

    # Filter where hour == target_hour (e.g., 0 for 00:00)
    matching_hours = df[df.index.hour == target_hour]

    if len(matching_hours) < 2:
        raise ValueError("Not enough occurrences of target hour to slice 24 hours.")

    # Get first and second occurrence timestamps
    start_time = matching_hours.index[0]
    end_time = matching_hours.index[1]

    # Slice between them
    df_24h = df[(df.index >= start_time) & (df.index < end_time)]

    if len(df_24h) != 24:
        raise ValueError(f"Expected 24 rows, got {len(df_24h)}. Time gap may not be hourly.")

    return df_24h


def prepare_input(df, scaler):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    tensor = torch.tensor(df_scaled[-SEQ_LEN:], dtype=torch.float32).unsqueeze(0)
    return tensor

def predict(model, input_tensor):
    with torch.no_grad():
        output = model(input_tensor).item()
        return output

def predict_from_apis(lat,lon,location):
    df = get_last_24h(lat, lon, location)
    if len(df) < SEQ_LEN:
        print("❌ Not enough data (need at least 24 hourly samples).")
        return

    # Show input time window
    start_time = df.index[-SEQ_LEN]
    end_time = df.index[-1]
    target_time = end_time + pd.Timedelta(hours=1)
    print(f"\n🕒 Model input data range: {start_time} → {end_time}")
    print(f"🔮 Prediction is for hour: {target_time}")

    scaler = joblib.load(SCALER_PATH)
    model = TimeSeriesTransformer(input_size=len(FEATURES))
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
    model.eval()

    input_tensor = prepare_input(df, scaler)
    prediction = predict(model, input_tensor)

def main():
    # === User input ===
    location = input("Enter location name (e.g., Pune): ")
    lat = float(input("Enter latitude: "))
    lon = float(input("Enter longitude: "))
    df = get_last_24h(lat, lon, location)
    if len(df) < SEQ_LEN:
        print("❌ Not enough data (need at least 24 hourly samples).")
        return

    # Show input time window
    start_time = df.index[-SEQ_LEN]
    end_time = df.index[-1]
    target_time = end_time + pd.Timedelta(hours=1)
    print(f"\n🕒 Model input data range: {start_time} → {end_time}")
    print(f"🔮 Prediction is for hour: {target_time}")

    scaler = joblib.load(SCALER_PATH)
    model = TimeSeriesTransformer(input_size=len(FEATURES))
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
    model.eval()

    input_tensor = prepare_input(df, scaler)
    prediction = predict(model, input_tensor)

    print(f"\n⚡ Predicted Solar Energy Output at {target_time}: {prediction:.2f} W/m²")


if __name__ == "__main__":
    main()
