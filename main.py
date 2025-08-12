# main.py
import os
import sys
import torch
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from pydantic import BaseModel
from typing import List
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models_code.model_5 import SpikeAwareHybrid
from final.final_fetch import compute_additional_features, add_time_features

# ==== CONFIG ====
MODEL_PATH = "models/spike_aware_q95_seq24.pth40"
SCALER_PATH = "scalers/feature_scaler_seq24.pkl"
SEQ_LEN = 24
API_KEY = "777628119ce049d484833355dbeca175"
API_URL = "https://api.weatherbit.io/v2.0/history/hourly"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]
TARGET = "ALLSKY_SFC_SW_DWN"

app = FastAPI(title="Solar Prediction API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scaler = joblib.load(SCALER_PATH)
model = SpikeAwareHybrid(input_size=len(FEATURES)).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()


def fetch_weather_data_range(lat, lon, start_time, end_time):
    """
    Fetch hourly weather data between start_time and end_time in IST.
    """
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
    # Convert to IST
    df.index = df.index.tz_convert('Asia/Kolkata')
    df = add_time_features(df)
    df = compute_additional_features(df, lat)
    return df

def prepare_input(df):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    return torch.tensor(df_scaled, dtype=torch.float32, device=DEVICE)

# ==== Endpoints ====
@app.get("/")
def root():
    return {"message": "Solar Prediction API is running"}

@app.get("/predict_current")
def predict_current(lat: float = Query(...), lon: float = Query(...)):
    """
    Predict next hour's solar radiation using last 24 hours of data.
    """
    try:
        # IST now → convert to UTC for API call
        ist_now = datetime.now(tz=timezone(timedelta(hours=5, minutes=30)))
        end_time = ist_now 
        start_time = end_time - timedelta(hours=24)

        # Convert to UTC for API call
        end_time_utc = end_time.astimezone(timezone.utc)
        start_time_utc = start_time.astimezone(timezone.utc)

        df = fetch_weather_data_range(lat, lon, start_time_utc, end_time_utc)

        if len(df) < SEQ_LEN:
            return {"error": f"Not enough data ({len(df)} rows) for sequence length {SEQ_LEN}"}

        tensor_input = prepare_input(df)[-SEQ_LEN:].unsqueeze(0)

        with torch.no_grad():
            pred_log = model(tensor_input).item()

        pred_wm2 = np.expm1(pred_log)
        return {
            "latitude": lat,
            "longitude": lon,
            "timestamp_predicted_ist": (ist_now + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
            "predicted_next_hour_wm2": round(pred_wm2, 2)
        }
    except Exception as e:
        return {"error": str(e)}

class Coord(BaseModel):
    lat: float
    lon: float

class CoordsRequest(BaseModel):
    coords: List[Coord]
import math

def safe_float(val):
    if val is None or math.isnan(val) or math.isinf(val):
        return None  # or 0, depending on your needs
    return float(val)
@app.post("/predict")
def predict_multiple(req: CoordsRequest):
    """
    Predict next hour's solar radiation for multiple locations using last 24 hours of data.
    """
    results = []
    ist_now = datetime.now(tz=timezone(timedelta(hours=5, minutes=30)))
    end_time = ist_now
    start_time = end_time - timedelta(hours=24)
    end_time_utc = end_time.astimezone(timezone.utc)
    start_time_utc = start_time.astimezone(timezone.utc)

    for coord in req.coords:
        try:
            df = fetch_weather_data_range(coord.lat, coord.lon, start_time_utc, end_time_utc)

            if len(df) < SEQ_LEN:
                results.append({
                    "latitude": coord.lat,
                    "longitude": coord.lon,
                    "error": f"Not enough data ({len(df)} rows) for sequence length {SEQ_LEN}"
                })
                continue

            tensor_input = prepare_input(df)[-SEQ_LEN:].unsqueeze(0)

            with torch.no_grad():
                pred_log = model(tensor_input).item()

            pred_wm2 = np.expm1(pred_log)
            pred_wm2 = safe_float(pred_wm2)
            results.append({
                "latitude": coord.lat,
                "longitude": coord.lon,
                "timestamp_predicted_ist": (ist_now + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
                "predicted_next_hour_wm2": round(pred_wm2, 2)
            })
        except Exception as e:
            results.append({
                "latitude": coord.lat,
                "longitude": coord.lon,
                "error": str(e)
            })

    return {"predictions": results}

@app.get("/last_7hours_real")
def last_7hours_real(lat: float = Query(...), lon: float = Query(...)):
    """
    Fetch last 7 hours real GHI (ALLSKY_SFC_SW_DWN) data in IST.
    """
    try:
        ist_now = datetime.now(tz=timezone(timedelta(hours=5, minutes=30)))
        end_time = ist_now 
        start_time = end_time - timedelta(hours=7)

        end_time_utc = end_time.astimezone(timezone.utc)
        start_time_utc = start_time.astimezone(timezone.utc)

        df = fetch_weather_data_range(lat, lon, start_time_utc, end_time_utc)

        df_out = df[[TARGET]].reset_index()
        df_out['timestamp_ist'] = df_out['timestamp_utc'].dt.strftime("%Y-%m-%d %H:%M:%S")
        df_out.rename(columns={TARGET: "ghi_wm2"}, inplace=True)

        return {
            "latitude": lat,
            "longitude": lon,
            "data": df_out[['timestamp_ist', 'ghi_wm2']].to_dict(orient="records")
        }
    except Exception as e:
        return {"error": str(e)}
