import numpy as np
import pandas as pd

MODEL_FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]

def _ensure_index_is_local(df):
    """
    Ensure DataFrame index is timezone-aware local time (Asia/Kolkata).
    If index is not tz-aware but column 'timestamp_utc' exists, use it.
    """
    if 'timestamp_utc' in df.columns:
        df = df.copy()
        df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'], utc=True)
        df.set_index('timestamp_utc', inplace=True)
        df.index = df.index.tz_convert('Asia/Kolkata')
        return df

    if df.index.tz is None:
        # assume index is UTC if naive, convert to UTC then to IST
        idx = pd.to_datetime(df.index)
        idx = idx.tz_localize('UTC').tz_convert('Asia/Kolkata')
        df = df.copy()
        df.index = idx
        return df

    # already tz-aware, convert to Asia/Kolkata
    return df.tz_convert('Asia/Kolkata')


def _add_time_feats(df):
    df = df.copy()
    df['hour'] = df.index.hour
    df['month'] = df.index.month
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24.0)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24.0)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12.0)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12.0)
    return df


def _compute_toa(df, lat):
    """Compute top-of-atmosphere clear-sky incoming shortwave (W/m^2)"""
    lat_rad = np.radians(lat)
    day_of_year = df.index.dayofyear
    decl = 23.45 * np.sin(np.radians(360.0 * (284 + day_of_year) / 365.0))
    decl_rad = np.radians(decl)
    hour_angle = np.radians((df.index.hour - 12.0) * 15.0)
    solar_constant = 1367.0
    cos_zenith = (np.sin(lat_rad) * np.sin(decl_rad) +
                  np.cos(lat_rad) * np.cos(decl_rad) * np.cos(hour_angle))
    cos_zenith = np.maximum(cos_zenith, 0.0)
    df['TOA_SW_DWN'] = solar_constant * cos_zenith
    return df


def harmonize_weatherbit_to_nasa(df_in, lat):
    """
    Convert a raw Weatherbit DataFrame into the set of model features and units
    expected by a model trained on NASA POWER-style variables.

    df_in: DataFrame from Weatherbit API (can contain columns like 'temp','rh','pres','wind_spd','clouds','ghi','dni','dhi','solar_rad')
    lat: latitude (degrees) used to compute TOA

    Returns: DataFrame with MODEL_FEATURES (filled and unit-corrected)
    """
    if df_in is None or len(df_in) == 0:
        raise ValueError("Input df is empty")

    df = _ensure_index_is_local(df_in)
    df = _add_time_feats(df)

    # ensure these raw columns exist (fill with NaN)
    raw_cols = ['temp', 'rh', 'pres', 'wind_spd', 'clouds', 'ghi', 'dni', 'dhi', 'solar_rad']
    for c in raw_cols:
        if c not in df.columns:
            df[c] = np.nan

    # --- basic conversions & fills ---
    # RH in % (Weatherbit gives 0-100) -> keep as percentage (NASA target uses %)
    df['RH2M'] = df['rh'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Pressure: Weatherbit 'pres' in hPa (≈ millibar). Convert to kPa to match NASA (~100 kPa)
    df['PS'] = df['pres'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0) / 10.0

    # Temp, Wind, Clouds
    df['T2M'] = df['temp'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df['WS2M'] = df['wind_spd'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df['CLOUD_AMT'] = df['clouds'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Radiation: fill missing with 0 (esp. nighttime)
    df['ALLSKY_SFC_SW_DWN'] = df['ghi'].fillna(0.0).astype(float)
    df['ALLSKY_SFC_SW_DNI'] = df['dni'].fillna(0.0).astype(float)
    df['ALLSKY_SFC_SW_DIFF'] = df['dhi'].fillna(0.0).astype(float)

    # Specific humidity QV2M: compute and convert to g/kg (NASA-like)
    T = df['temp'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    RH_frac = (df['rh'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(0.0) / 100.0).clip(0,1)
    P_hpa = df['pres'].astype(float).replace([np.inf, -np.inf], np.nan).fillna(1013.25)  # fallback 1013 hPa
    es = 6.112 * np.exp((17.67 * T) / (T + 243.5))
    e = RH_frac * es
    # qv in kg/kg
    qv = (0.622 * e) / (P_hpa - (1 - 0.622) * e)
    df['QV2M'] = (qv * 1000.0).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Recompute TOA from lat/time (ensures consistent TOA in local time)
    df = _compute_toa(df, lat)

    # Clip DNI/DHI to be within [0, TOA]
    df['ALLSKY_SFC_SW_DNI'] = df['ALLSKY_SFC_SW_DNI'].clip(lower=0.0, upper=df['TOA_SW_DWN'])
    df['ALLSKY_SFC_SW_DIFF'] = df['ALLSKY_SFC_SW_DIFF'].clip(lower=0.0, upper=df['TOA_SW_DWN'])

    # Nighttime masking: when TOA is tiny, set solar fields to zero
    night_mask = df['TOA_SW_DWN'] < 5.0
    df.loc[night_mask, ['ALLSKY_SFC_SW_DWN','ALLSKY_SFC_SW_DNI','ALLSKY_SFC_SW_DIFF']] = 0.0

    # Longwave downwelling (basic Stefan-Boltzmann approach with empirical emissivity)
    sigma = 5.670374419e-8
    temp_K = (df['temp'].astype(float) + 273.15).replace([np.inf, -np.inf], np.nan).fillna(273.15)
    emissivity = 0.7 + 0.2 * (RH_frac.clip(0,1) ** (1.0/7.0))
    df['ALLSKY_SFC_LW_DWN'] = emissivity * sigma * (temp_K ** 4)

    # Ensure model features exist and have no NaN
    out = pd.DataFrame(index=df.index)
    for feat in MODEL_FEATURES:
        if feat in df.columns:
            out[feat] = df[feat].replace([np.inf, -np.inf], np.nan).fillna(0.0)
        else:
            out[feat] = 0.0

    return out
