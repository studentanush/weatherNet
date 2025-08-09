import torch
from torch.utils.data import Dataset
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

class SolarLSTMDataset(Dataset):
    def __init__(self, df, seq_len=24):
        self.seq_len = seq_len
        df = df.replace(-999.0, np.nan).dropna()
    
        df['datetime'] = pd.to_datetime(df['datetime'])  # or set index as datetime

        # Add time-based cyclic features
        df['hour'] = df['datetime'].dt.hour
        df['month'] = df['datetime'].dt.month

        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)

        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

        # Features (excluding ALLSKY_SRF_ALB as discussed)
        self.feature_cols = [
            "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
            "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
            "ALLSKY_SFC_LW_DWN", "T2M",
            "hour_sin", "hour_cos", "month_sin", "month_cos"
        ]
        self.target_col = "ALLSKY_SFC_SW_DWN"

        # Normalize features
        self.scaler = StandardScaler()
        features = self.scaler.fit_transform(df[self.feature_cols].values)
        target = df[self.target_col].values

        # Create sequence windows
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
