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
    end_time = datetime.now(tz=timezone.utc)-timedelta(hours=7)
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
    df.index = df.index.tz_convert('Asia/Kolkata')
    df = add_time_features(df)
    df = compute_additional_features(df,lat)
    print(df.columns)
    return df
def compute_toa(df, lat):
    lat_rad = np.radians(lat)
    day_of_year = df.index.dayofyear
    decl = 23.45 * np.sin(np.radians(360 * (284 + day_of_year) / 365))
    decl_rad = np.radians(decl)
    hour_angle = np.radians((df.index.hour - 12) * 15)
    solar_constant = 1367
    cos_zenith = (np.sin(lat_rad) * np.sin(decl_rad) +
                  np.cos(lat_rad) * np.cos(decl_rad) * np.cos(hour_angle))
    cos_zenith = np.maximum(cos_zenith, 0)
    df['TOA_SW_DWN'] = solar_constant * cos_zenith
    return df

def compute_additional_features(df, lat):
    df['RH2M'] = df['rh']
    df['PS'] = df['pres'] / 10.0  # hPa → kPa
    df['T2M'] = df['temp']
    df['WS2M'] = df['wind_spd']
    df['CLOUD_AMT'] = df['clouds']

    df['ALLSKY_SFC_SW_DWN'] = df['ghi']
    df['ALLSKY_SFC_SW_DNI'] = df['dni']  # already W/m², just note daylight gap
    df['ALLSKY_SFC_SW_DIFF'] = df['dhi']

    # QV2M in g/kg
    T = df['temp']
    RH = df['rh'] / 100.0
    P = df['pres']
    es = 6.112 * np.exp((17.67 * T) / (T + 243.5))
    e = RH * es
    qv = (0.622 * e) / (P - (1 - 0.622) * e)
    df['QV2M'] = qv * 1000  # g/kg

    # Compute TOA radiation from lat & timestamp
    df = compute_toa(df, lat)

    # Longwave radiation
    sigma = 5.67e-8
    temp_K = df['temp'] + 273.15
    emissivity = 0.7 + 0.2 * (RH ** (1 / 7))
    df['ALLSKY_SFC_LW_DWN'] = emissivity * sigma * (temp_K ** 4)

    return df

def evaluation_fetch(lat, lon,key ="777628119ce049d484833355dbeca175" ):
    now = datetime.now()
    today_midnight = datetime(now.year, now.month, now.day)
    yesterday_midnight = today_midnight - timedelta(days=3)
    print(yesterday_midnight)
    print(today_midnight)
    params = {
        "lat": lat,
        "lon": lon,
        "key": key,
        "start_date": yesterday_midnight
        .strftime("%Y-%m-%d:%H"),
        "end_date": today_midnight.strftime("%Y-%m-%d:%H")
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
    print(df.columns)
    return df



if __name__ == "__main__":
    fetch_weatherbit_data(LAT, LON, API_KEY)
