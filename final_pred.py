from final_fetch import fetch_weatherbit_data
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



def prepare_input(df, scaler):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    tensor = torch.tensor(df_scaled[-SEQ_LEN:], dtype=torch.float32,device='cpu').unsqueeze(0)
    return tensor
def predict(model, input_tensor):
    with torch.no_grad():
        output = model(input_tensor).item()
        return output
def main():
    lat = float(input("Enter the lat :- "))
    lon = float(input("Enter the lon :- "))
    df:pd.DataFrame = fetch_weatherbit_data(lat,lon,"777628119ce049d484833355dbeca175")
    print(df.columns)
    scaler = joblib.load(SCALER_PATH)
    tensor_input = prepare_input(df,scaler)
    model = TimeSeriesTransformer(input_size=len(FEATURES))
    model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
    model.eval()
    prediction = predict(model, tensor_input)
    print(f"\n⚡ Predicted Solar Energy Output at : {prediction:.2f} W/m²")

if __name__ == "__main__":
    main()


