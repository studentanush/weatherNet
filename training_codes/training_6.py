import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import joblib
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from final.dataset_2 import SolarLSTMDataset
from models_code.model_5 import SpikeAwareHybrid

# ---------------- CONFIG ----------------
SEQ_LEN = 24
BATCH_SIZE = 64
EPOCHS = 10
LR = 0.001
Q_VAL = 0.95

DATA_PATH = "dataset/final.csv"
TEST_PATH = "dataset/final.csv"
MODEL_SAVE_PATH = f"models/spike_aware_q{int(Q_VAL*100)}_seq{SEQ_LEN}.pth"
SCALER_SAVE_PATH = f"scalers/feature_scaler_seq{SEQ_LEN}.pkl"
print(MODEL_SAVE_PATH)
print(SCALER_SAVE_PATH)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

FEATURES = [
    "ALLSKY_SFC_SW_DIFF", "ALLSKY_SFC_SW_DNI", "TOA_SW_DWN",
    "RH2M", "QV2M", "PS", "WS2M", "CLOUD_AMT",
    "ALLSKY_SFC_LW_DWN", "T2M", "hour_sin", "hour_cos", "month_sin", "month_cos"
]

# ---------------- LOAD TRAIN DATA ----------------
df = pd.read_csv(DATA_PATH)
df["datetime"] = pd.to_datetime(df["datetime"])

dataset = SolarLSTMDataset(df, seq_len=SEQ_LEN)
joblib.dump(dataset.scaler, SCALER_SAVE_PATH)

# Split train/val
train_size = int(0.8 * len(dataset))
val_size = len(dataset) - train_size
train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

# ---------------- MODEL ----------------
model = SpikeAwareHybrid(input_size=len(FEATURES)).to(DEVICE)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=LR)

# ---------------- TRAIN LOOP ----------------
def train_model():
    best_val_loss = float("inf")
    history = {"train_loss": [], "val_loss": []}
    try:
        model.load_state_dict(torch.load(MODEL_SAVE_PATH))
    except:
        print("can not load the model the model for training starting the training from scrach")
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        for X, y in train_loader:
            X, y = X.to(DEVICE), y.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(X)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        avg_train_loss = running_loss / len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X, y in val_loader:
                X, y = X.to(DEVICE), y.to(DEVICE)
                outputs = model(X)
                loss = criterion(outputs, y)
                val_loss += loss.item()
        avg_val_loss = val_loss / len(val_loader)

        history["train_loss"].append(avg_train_loss)
        history["val_loss"].append(avg_val_loss)

        print(f"Epoch [{epoch+1}/{EPOCHS}] Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

        # Save best model
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print("✅ Best model saved")

    return history

# ---------------- EVALUATION ON TEST SET ----------------

def add_time_features(df):
    df = df.copy()
    df["hour"] = df["datetime"].dt.hour
    df["month"] = df["datetime"].dt.month
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df

def evaluate_and_plot_on_val():
    scaler = joblib.load(SCALER_SAVE_PATH)
    model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=DEVICE))
    model.eval()

    val_indices = val_dataset.indices
    df_val = df.iloc[val_indices].reset_index(drop=True)

    # Add cyclic features like in training
    df_val = add_time_features(df_val)

    actual = df_val["ALLSKY_SFC_SW_DWN"].values.copy()
    df_val["ALLSKY_SFC_SW_DWN"] = np.log1p(df_val["ALLSKY_SFC_SW_DWN"].clip(lower=0))

    predicted = []
    for i in range(13000, 13100):
        input_df = df_val.iloc[i - SEQ_LEN:i]
        input_features = input_df[FEATURES]
        input_scaled = scaler.transform(input_features)

        if input_scaled.shape[0] == SEQ_LEN:
            input_tensor = torch.tensor(input_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                pred_log = model(input_tensor).item()
            pred_original = np.expm1(pred_log)
            predicted.append(pred_original)

    actual_aligned = actual[SEQ_LEN + 1 : SEQ_LEN + 1 + len(predicted)]

    plt.figure(figsize=(12, 6))
    plt.plot(actual_aligned, label="Actual Solar Radiation")
    plt.plot(predicted, label="Predicted Solar Radiation")
    plt.xlabel("Validation Time Step")
    plt.ylabel("Solar Radiation")
    plt.title(f"Validation Accuracy (SEQ_LEN={SEQ_LEN}, q={Q_VAL})")
    plt.legend()
    plt.grid(True)
    plt.savefig(f"models/val_eval_seq_1{SEQ_LEN}.png", dpi=300)
    plt.show()
    print(f"✅ Validation plot saved as models/val_eval_seq{SEQ_LEN}.png")

def evaluate_and_plot():
    scaler = joblib.load(SCALER_SAVE_PATH)
    model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=DEVICE))
    model.eval()

    df_test = pd.read_csv(TEST_PATH)

    df_test["datetime"] = pd.to_datetime(df_test["datetime"])
    df_test = dataset.df
    actual = df_test["ALLSKY_SFC_SW_DWN"].values.copy()
    df_test["ALLSKY_SFC_SW_DWN"] = np.log1p(df_test["ALLSKY_SFC_SW_DWN"])

    predicted = []
    for i in range(26,1000):
        input_df = df_test.iloc[i - SEQ_LEN:i]
        input_features = input_df[FEATURES]
        input_scaled = scaler.transform(input_features)

        if input_scaled.shape[0] == SEQ_LEN:
            input_tensor = torch.tensor(input_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                pred_log = model(input_tensor).item()
            pred_original = np.expm1(pred_log)
            predicted.append(pred_original)

    actual_aligned = actual[SEQ_LEN + 1 : SEQ_LEN + 1 + len(predicted)]

    plt.figure(figsize=(86, 6))
    plt.plot(actual_aligned, label="Actual Solar Radiation")
    plt.plot(predicted, label="Predicted Solar Radiation")
    plt.xlabel("Time Step")
    plt.ylabel("Solar Radiation")
    plt.title(f"Model Accuracy (SEQ_LEN={SEQ_LEN}, q={Q_VAL})")
    plt.legend()
    plt.grid(True)
    plt.savefig(f"models/test_eval_seq{SEQ_LEN}.png", dpi=300)
    plt.show()
    print(f"✅ Test plot saved as models/test_eval_seq{SEQ_LEN}.png")

# ---------------- RUN ----------------
if __name__ == "__main__":
    # train_model()
    evaluate_and_plot()
