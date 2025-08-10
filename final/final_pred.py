import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from final_fetch import fetch_weatherbit_data
import torch
import numpy as np
import pandas as pd
from models_code.model_5 import SpikeAwareHybrid
from sklearn.preprocessing import StandardScaler
import joblib
from fetch import fetch_and_return
from datetime import datetime, timedelta

MODEL_PATH = "models/spike_aware_q95_seq24.pth"
SCALER_PATH ="scalers/feature_scaler_seq24.pkl"
SEQ_LEN = 24
FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]
TARGET = "ALLSKY_SFC_SW_DWN"
DEVICE = DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'


def prepare_input(df, scaler):
    if len(df) < SEQ_LEN:
        raise ValueError(f"Not enough data ({len(df)} rows) for sequence length {SEQ_LEN}")
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    tensor = torch.tensor(df_scaled[-SEQ_LEN:], dtype=torch.float32, device=DEVICE).unsqueeze(0)
    return tensor
def predict(model, input_tensor):
    with torch.no_grad():
        output = model(input_tensor).item()
        return output
def main():
    lat = float(input("Enter the lat :- "))
    lon = float(input("Enter the lon :- "))
    
    df = fetch_weatherbit_data(lat, lon, "777628119ce049d484833355dbeca175")  # Make sure this is the corrected version
    print(df[FEATURES].head())

    scaler = joblib.load(SCALER_PATH)
    tensor_input = prepare_input(df, scaler)

    model = SpikeAwareHybrid(input_size=len(FEATURES)).to(DEVICE)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    prediction = predict(model, tensor_input)
    final_pred_after_log = np.expm1(prediction)
    print(f"\n⚡ Predicted Solar Energy Output: {final_pred_after_log:.2f} W/m²")


if __name__ == "__main__":
    main()


