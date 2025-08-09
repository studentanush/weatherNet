import os
import sys
import torch
import pandas as pd
from torch.utils.data import DataLoader, random_split

# --- Make sure root path is visible ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from final.dataset import SolarLSTMDataset
from models_code.model_5 import SpikeAwareHybrid

# ---------------------------
# Loss & Eval
# ---------------------------
class QuantileLoss(torch.nn.Module):
    def __init__(self, q=0.9):
        super().__init__()
        self.q = q
    def forward(self, preds, target):
        errors = target - preds
        return torch.mean(torch.max(self.q * errors, (self.q - 1) * errors))

def evaluate(model, loader, criterion, device):
    model.eval()
    loss_sum = 0
    with torch.no_grad():
        for X, y in loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            loss = criterion(preds, y)
            loss_sum += loss.item() * X.size(0)
    return loss_sum / len(loader.dataset)

# ---------------------------
# Training Loop
# ---------------------------
def train_model(model, train_loader, val_loader, epochs, lr, device, save_path):
    model.to(device)
    criterion = QuantileLoss(q=0.9)
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

# ---------------------------
# Main
# ---------------------------
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    df = pd.read_csv("dataset/final.csv")  # adjust if path differs
    dataset = SolarLSTMDataset(df, seq_len=24)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64)

    model = SpikeAwareHybrid(input_size=len(dataset.feature_cols))

    os.makedirs("models", exist_ok=True)
    save_path = "models/best_spikeaware.pth"

    train_model(model, train_loader, val_loader, epochs=50, lr=0.001, device=device, save_path=save_path)
    print(f"✅ Training complete. Best model saved to {save_path}")
