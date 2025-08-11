# train_deep_solar.py
import os
import random
import math
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.cuda.amp import autocast, GradScaler

# If you already have SolarLSTMDataset in dataset.py, import it:
try:
    from dataset import SolarLSTMDataset
except Exception:
    # fallback minimal dataset if not present (expects same df preprocessing as your dataset file)
    from torch.utils.data import Dataset
    class SolarLSTMDataset(Dataset):
        def __init__(self, df, seq_len=24, feature_cols=None, target_col="ALLSKY_SFC_SW_DWN"):
            # assume df already cleaned & has datetime and the features used earlier
            self.seq_len = seq_len
            if isinstance(df, str):
                df = pd.read_csv(df)
            df = df.replace(-999.0, np.nan).dropna()
            df['datetime'] = pd.to_datetime(df.get('datetime', df.get('DATE_TIME')))
            if feature_cols is None:
                self.feature_cols = [
                    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
                    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
                    "ALLSKY_SFC_LW_DWN", "T2M",
                    "hour_sin", "hour_cos", "month_sin", "month_cos"
                ]
            else:
                self.feature_cols = feature_cols
            self.target_col = target_col
            # naive scaler using train values (user should ideally fit on train only)
            from sklearn.preprocessing import StandardScaler
            self.scaler = StandardScaler()
            features = self.scaler.fit_transform(df[self.feature_cols].values)
            target = df[self.target_col].values
            X, y = [], []
            for i in range(len(df) - seq_len):
                X.append(features[i:i+seq_len])
                y.append(target[i+seq_len])
            self.X = torch.tensor(np.array(X), dtype=torch.float32)
            self.y = torch.tensor(np.array(y), dtype=torch.float32).unsqueeze(1)
        def __len__(self):
            return len(self.X)
        def __getitem__(self, idx):
            return self.X[idx], self.y[idx]


# ---------- Model: deep CNN -> stacked BiLSTM -> Multihead Attention -> deep MLP ---------- #
class DeepSolarModel(nn.Module):
    def __init__(self, input_size, hidden_size=256, num_lstm_layers=4, dropout=0.3, num_heads=8):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(input_size, 128, kernel_size=5, padding=2),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Conv1d(128, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Conv1d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(256)
        )
        self.lstm = nn.LSTM(256, hidden_size, num_layers=num_lstm_layers,
                            batch_first=True, bidirectional=True, dropout=dropout)
        self.attn = nn.MultiheadAttention(hidden_size * 2, num_heads=num_heads, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, 1)
        )

    def forward(self, x):
        # x: [batch, seq_len, features]
        x = x.transpose(1, 2)                 # -> [batch, features, seq_len]
        x = self.cnn(x)                      # -> [batch, 256, seq_len]
        x = x.transpose(1, 2)                # -> [batch, seq_len, features]
        lstm_out, _ = self.lstm(x)           # -> [batch, seq_len, hidden*2]
        attn_out, _ = self.attn(lstm_out, lstm_out, lstm_out)
        context = attn_out.mean(dim=1)       # global mean pooling
        return self.fc(context)


# ---------- Losses ---------- #
class QuantileLoss(nn.Module):
    def __init__(self, q=0.9):
        super().__init__()
        self.q = q
    def forward(self, preds, target):
        errors = target - preds
        return torch.mean(torch.max(self.q * errors, (self.q - 1) * errors))

class CombinedLoss(nn.Module):
    def __init__(self, q=0.9, huber_delta=1.0, alpha=0.5):
        super().__init__()
        self.quantile = QuantileLoss(q=q)
        self.huber = nn.SmoothL1Loss(beta=huber_delta)
        self.alpha = alpha
    def forward(self, preds, target):
        return self.alpha * self.huber(preds, target) + (1 - self.alpha) * self.quantile(preds, target)


# ---------- Metrics ---------- #
def mae(preds, target):
    return torch.mean(torch.abs(preds - target)).item()

def rmse(preds, target):
    return torch.sqrt(torch.mean((preds - target) ** 2)).item()

def r2_score(preds, target):
    t_mean = torch.mean(target)
    ss_res = torch.sum((target - preds) ** 2)
    ss_tot = torch.sum((target - t_mean) ** 2)
    return (1 - ss_res / (ss_tot + 1e-8)).item()


# ---------- Utilities ---------- #
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

class EarlyStopping:
    def __init__(self, patience=8, min_delta=1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.best = math.inf
        self.counter = 0
    def step(self, val):
        if val + self.min_delta < self.best:
            self.best = val
            self.counter = 0
            return False
        else:
            self.counter += 1
            return self.counter >= self.patience


# ---------- Evaluation ---------- #
def evaluate_model(model, val_loader, criterion, device='cuda'):
    model.eval()
    total_loss = 0.0
    preds_all, y_all = [], []
    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            loss = criterion(preds, y)
            total_loss += loss.item() * X.size(0)
            preds_all.append(preds.detach().cpu())
            y_all.append(y.detach().cpu())
    preds_all = torch.cat(preds_all, dim=0)
    y_all = torch.cat(y_all, dim=0)
    metrics = {
        "loss": total_loss / len(val_loader.dataset),
        "mae": mae(preds_all, y_all),
        "rmse": rmse(preds_all, y_all),
        "r2": r2_score(preds_all, y_all)
    }
    return metrics


# ---------- Training Loop ---------- #
def train_model(model, train_loader, val_loader, epochs=50, lr=1e-3, device=None,
                weight_decay=1e-4, clip_grad=1.0, save_path="models/best_deep.pth"):
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    criterion = CombinedLoss(q=0.92, huber_delta=1.0, alpha=0.6)    # tune q & alpha
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=4, verbose=True)
    scaler = GradScaler()
    earlystop = EarlyStopping(patience=10)
    history = {"train_loss": [], "val_loss": [], "val_mae": [], "val_rmse": [], "val_r2": []}
    best_val = math.inf

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for X, y in train_loader:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            with autocast():
                preds = model(X)
                loss = criterion(preds, y)
            scaler.scale(loss).backward()
            # gradient clipping
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad)
            scaler.step(optimizer)
            scaler.update()
            running_loss += loss.item() * X.size(0)

        train_loss = running_loss / len(train_loader.dataset)
        val_metrics = evaluate_model(model, val_loader, criterion, device)
        scheduler.step(val_metrics["loss"])
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_metrics["loss"])
        history["val_mae"].append(val_metrics["mae"])
        history["val_rmse"].append(val_metrics["rmse"])
        history["val_r2"].append(val_metrics["r2"])

        print(f"[{epoch:02d}/{epochs}] Train Loss: {train_loss:.4f}  Val Loss: {val_metrics['loss']:.4f}  MAE: {val_metrics['mae']:.3f}  RMSE: {val_metrics['rmse']:.3f}  R2: {val_metrics['r2']:.3f}")

        # checkpoint best
        if val_metrics["loss"] < best_val - 1e-6:
            best_val = val_metrics["loss"]
            os.makedirs(os.path.dirname(save_path) or ".", exist_ok=True)
            torch.save({
                "epoch": epoch,
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "scaler_state": scaler.state_dict(),
                "val_loss": best_val
            }, save_path)
            print(f" -> Saved best model ({save_path})")

        # early stop
        if earlystop.step(val_metrics["loss"]):
            print("Early stopping triggered.")
            break

    return model, history


# ---------- Plot ---------- #
def plot_history(history, save_path="loss_history.png"):
    plt.figure(figsize=(8,4))
    plt.plot(history["train_loss"], label="train")
    plt.plot(history["val_loss"], label="val")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(save_path)
    plt.show()


# ---------- Main ---------- #
def main():
    set_seed(42)
    df = pd.read_csv("dataset/final.csv")
    df['datetime'] = pd.to_datetime(df['datetime'])

    # create engineered time features if not present
    if 'hour_sin' not in df.columns:
        df['hour'] = df['datetime'].dt.hour
        df['month'] = df['datetime'].dt.month
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

    seq_len = 24  # use last 24 hours
    dataset = SolarLSTMDataset(df, seq_len=seq_len)

    # TIME-BASED SPLIT (better for forecasting than random_split)
    n = len(dataset)
    train_end = int(0.8 * n)
    val_end = int(0.9 * n)
    indices = list(range(n))
    train_idx = indices[:train_end]
    val_idx = indices[train_end:val_end]
    test_idx = indices[val_end:]

    from torch.utils.data import Subset
    train_ds = Subset(dataset, train_idx)
    val_ds = Subset(dataset, val_idx)
    test_ds = Subset(dataset, test_idx)

    batch_size = 64
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    input_size = dataset.X.shape[2]
    model = DeepSolarModel(input_size=input_size, hidden_size=256, num_lstm_layers=4, dropout=0.3, num_heads=8)

    # optionally load pre-trained weights if you had any
    ckpt_path = "models/best_deep.pth"
    if os.path.exists(ckpt_path):
        ckpt = torch.load(ckpt_path, map_location="cpu")
        model.load_state_dict(ckpt["model_state"])
        print("Loaded checkpoint:", ckpt_path)

    model, history = train_model(model, train_loader, val_loader,
                                 epochs=100, lr=3e-4, device=None,
                                 weight_decay=1e-4, clip_grad=1.0, save_path=ckpt_path)

    plot_history(history, save_path="loss_history.png")

    # final test eval
    best = torch.load(ckpt_path, map_location="cpu")
    model.load_state_dict(best["model_state"])
    metrics = evaluate_model(model, test_loader, CombinedLoss(q=0.92, huber_delta=1.0, alpha=0.6), device=("cuda" if torch.cuda.is_available() else "cpu"))
    print("Test metrics:", metrics)

if __name__ == "__main__":
    main()
