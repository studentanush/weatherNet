import os
import sys
import torch
import pandas as pd
from torch.utils.data import DataLoader, random_split, Subset
import numpy as np

# --- Add repo root to path ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from final.dataset import SolarLSTMDataset
from models_code.model_5 import SpikeAwareHybrid

# ----------------------
# Weighted Quantile Loss
# ----------------------
class WeightedQuantileLoss(torch.nn.Module):
    def __init__(self, q=0.9):
        super().__init__()
        self.q = q
    def forward(self, preds, target):
        errors = target - preds
        weights = 1.0 + (target / target.max()) * 4.0  # weight peaks up to 5x more
        loss = torch.max(self.q * errors, (self.q - 1) * errors) * weights
        return torch.mean(loss)

# ----------------------
# Oversample High Peaks
# ----------------------
def oversample_high_peaks(dataset, threshold):
    high_idxs = [i for i in range(len(dataset)) if dataset.y[i] > threshold]
    return high_idxs

# ----------------------
# Evaluation
# ----------------------
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    with torch.no_grad():
        for X, y in loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            total_loss += criterion(preds, y).item() * X.size(0)
    return total_loss / len(loader.dataset)

# ----------------------
# Train Loop
# ----------------------
def train(model, train_loader, val_loader, epochs, lr, device, save_path):
    criterion = WeightedQuantileLoss(q=0.9)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, factor=0.5, patience=5)

    best_val = float('inf')
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        for X, y in train_loader:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            preds = model(X)
            loss = criterion(preds, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * X.size(0)

        train_loss /= len(train_loader.dataset)
        val_loss = evaluate(model, val_loader, criterion, device)
        scheduler.step(val_loss)

        print(f"Epoch {epoch+1}/{epochs} | Train: {train_loss:.4f} | Val: {val_loss:.4f}")

        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), save_path)

# ----------------------
# Main
# ----------------------
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load and prepare dataset
    df = pd.read_csv("/content/final.csv")  # change path if needed
    dataset = SolarLSTMDataset(df, seq_len=24)

    # Oversample high peaks
    high_peak_idxs = oversample_high_peaks(dataset, threshold=500)
    print(f"High peak samples: {len(high_peak_idxs)}")
    oversampled_idxs = list(range(len(dataset))) + high_peak_idxs * 3  # 3x more peaks

    train_size = int(0.8 * len(oversampled_idxs))
    train_idxs = oversampled_idxs[:train_size]
    val_idxs = oversampled_idxs[train_size:]

    train_loader = DataLoader(Subset(dataset, train_idxs), batch_size=64, shuffle=True)
    val_loader = DataLoader(Subset(dataset, val_idxs), batch_size=64)

    # Init model
    model = SpikeAwareHybrid(input_size=len(dataset.feature_cols))

    # Train
    os.makedirs("models", exist_ok=True)
    save_path = "models/best_spikeaware.pth"
    train(model, train_loader, val_loader, epochs=50, lr=0.001, device=device, save_path=save_path)

    print(f"✅ Training done, best model saved to {save_path}")
