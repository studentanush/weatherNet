import torch
from torch.utils.data import Dataset
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os

class SolarLSTMDataset(Dataset):
    def __init__(self, df, seq_len=12, scaler_path=None, save_scaler=False):
        self.seq_len = seq_len
        df = df.replace(-999.0, np.nan).dropna()

        df['datetime'] = pd.to_datetime(df['datetime'])

        # Cyclic time features
        df['hour'] = df['datetime'].dt.hour
        df['month'] = df['datetime'].dt.month
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        self.df = df
        self.feature_cols = [
            "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
            "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
            "ALLSKY_SFC_LW_DWN", "T2M",
            "hour_sin", "hour_cos", "month_sin", "month_cos"
        ]
        self.target_col = "ALLSKY_SFC_SW_DWN"

        # Load or fit scaler
        if scaler_path and os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        else:
            self.scaler = StandardScaler()
            self.scaler.fit(df[self.feature_cols].values)
            if save_scaler and scaler_path:
                os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
                joblib.dump(self.scaler, scaler_path)

        features = self.scaler.transform(df[self.feature_cols].values)

        # Log-transform target for spike-aware training
        target = np.log1p(df[self.target_col].values)

        # Sequence windows
        self.X, self.y = [], []
        for i in range(len(df) - seq_len):
            self.X.append(features[i:i+seq_len])
            self.y.append(target[i+seq_len])

        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y = torch.tensor(self.y, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

    @staticmethod
    def inverse_transform_target(preds):
        """Revert log1p transformation to original units"""
        return np.expm1(preds)
