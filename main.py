from fastapi import FastAPI, Query
from pydantic import BaseModel
from final_fetch import fetch_weatherbit_data
from models_code.model import TimeSeriesTransformer
from fastapi.middleware.cors import CORSMiddleware
import joblib
import torch
import numpy as np

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with ["http://localhost:3000"] for specific frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "models/version2.pth"
SCALER_PATH = "scalers/feature_scaler.pkl"
SEQ_LEN = 24
FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]

scaler = joblib.load(SCALER_PATH)
model = TimeSeriesTransformer(input_size=len(FEATURES))
model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
model.eval()

def prepare_input(df):
    df = df[FEATURES]
    df_scaled = scaler.transform(df)
    tensor = torch.tensor(df_scaled[-SEQ_LEN:], dtype=torch.float32).unsqueeze(0)
    return tensor

@app.get("/predict")
def predict(lat: float = Query(...), lon: float = Query(...)):
    try:
        df = fetch_weatherbit_data(lat, lon, "777628119ce049d484833355dbeca175")
        input_tensor = prepare_input(df)
        with torch.no_grad():
            prediction = model(input_tensor).item()
        return {"prediction_wm2": round(prediction, 2)}
    except Exception as e:
        return {"error": str(e)}
