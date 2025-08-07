import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

# === CONFIG ===
API_URL = "https://api.weatherbit.io/v2.0/history/hourly"
API_KEY = "777628119ce049d484833355dbeca175"
LAT = 28.6139
LON = 77.2090

FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]

def add_time_features(df):
    df['hour'] = df.index.hour
    df['month'] = df.index.month
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    return df

def fetch_weatherbit_data(lat, lon, key):
    end_time = datetime.now(tz=timezone.utc)
    start_time = end_time - timedelta(hours=24)

    params = {
        "lat": lat,
        "lon": lon,
        "key": key,
        "start_date": start_time.strftime("%Y-%m-%d:%H"),
        "end_date": end_time.strftime("%Y-%m-%d:%H")
    }

    r = requests.get(API_URL, params=params)
    print(r.url)
    r.raise_for_status()
    data = r.json()['data']

    df = pd.DataFrame(data)
    df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'], utc=True)
    df.set_index('timestamp_utc', inplace=True)

    df = add_time_features(df)
    df = compute_additional_features(df)
    df = rename_for_model(df)
    print(df.columns)
    return df

def compute_additional_features(df):
    df['RH2M'] = df['rh']
    df['PS'] = df['pres']
    df['T2M'] = df['temp']
    df['WS2M'] = df['wind_spd']
    df['CLOUD_AMT'] = df['clouds']
    df['ALLSKY_SFC_SW_DWN'] = df['ghi']
    df['ALLSKY_SFC_SW_DNI'] = df['dni']
    df['ALLSKY_SFC_SW_DIFF'] = df['dhi']

    T = df['temp']
    RH = df['rh'] / 100.0
    P = df['pres']
    es = 6.112 * np.exp((17.67 * T) / (T + 243.5))
    e = RH * es
    qv = (0.622 * e) / (P - (1 - 0.622) * e)
    df['QV2M'] = qv

    df['TOA_SW_DWN'] = df['solar_rad'].fillna(0)

    sigma = 5.67e-8
    temp_K = df['temp'] + 273.15
    emissivity = 0.7 + 0.2 * (RH ** (1/7))
    df['ALLSKY_SFC_LW_DWN'] = emissivity * sigma * (temp_K ** 4)

    return df

def rename_for_model(df):
    return df[FEATURES]

# === MAIN ===
if __name__ == "__main__":
    fetch_weatherbit_data(LAT, LON, API_KEY)
