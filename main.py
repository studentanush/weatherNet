from fastapi import FastAPI, Query
from pydantic import BaseModel
import torch
import joblib
from datetime import datetime
from model import TimeSeriesTransformer
from fetch import fetch_and_return
import numpy as np
import pandas as pd

app = FastAPI()

# === Configs ===
MODEL_PATH = "models/version2.pth"
SCALER_PATH = "scalers/feature_scaler.pkl"
SEQ_LEN = 24
FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]
REAL_API_FEATURES = FEATURES[:-4] + ["ALLSKY_SFC_SW_DWN"]


def add_time_features(df):
    df['hour'] = df.index.hour
    df['month'] = df.index.month
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    return df


def slice_24h_from_hour(df, target_hour=0):
    df = df.sort_index()
    matching_hours = df[df.index.hour == target_hour]
    if len(matching_hours) < 2:
        raise ValueError("Not enough target hour to slice 24h.")
    start_time = matching_hours.index[0]
    end_time = matching_hours.index[1]
    df_24h = df[(df.index >= start_time) & (df.index < end_time)]
    if len(df_24h) != 24:
        raise ValueError("Expected 24 rows.")
    return df_24h


def get_last_24h(lat, lon, location):
    all_data = {}
    for param in REAL_API_FEATURES:
        df = fetch_and_return(param, lat, lon, location, days_ago=4)[0]
        df = df.replace(-999.0, 0)
        all_data[param] = df.set_index("datetime")[param]
    df_full = pd.concat(all_data.values(), axis=1)
    df_full.columns = REAL_API_FEATURES
    df_full.index = pd.to_datetime(df_full.index)
    df_full = df_full.sort_index()
    df_full = add_time_features(df_full)
    return slice_24h_from_hour(df_full, datetime.now().hour)


def prepare_input(df, scaler):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    tensor = torch.tensor(df_scaled[-SEQ_LEN:], dtype=torch.float32).unsqueeze(0)
    return tensor


def predict(model, input_tensor):
    with torch.no_grad():
        output = model(input_tensor).item()
        return output


# load model and scalers

scaler = joblib.load(SCALER_PATH)
model = TimeSeriesTransformer(input_size=len(FEATURES))
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()


@app.get("/predict")
def predict_solar_energy(lat: float = Query(...), lon: float = Query(...), location: str = Query(...)):
    try:
        df = get_last_24h(lat, lon, location)
        input_tensor = prepare_input(df, scaler)
        prediction = predict(model, input_tensor)
        start_time = df.index[-SEQ_LEN]
        end_time = df.index[-1]
        target_time = end_time + pd.Timedelta(hours=1)
        return {
            "location": location,
            "target_time": target_time.strftime("%Y-%m-%d %H:%M:%S"),
            "prediction_w_per_m2": round(prediction, 2)
        }
    except Exception as e:
        return {"error": str(e)}
